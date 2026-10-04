//! IPC bridge used by the end-to-end test suite in `tests/e2e`.
//!
//! Builds a mock Tauri app with the *real* command list (`app_commands!`) and
//! exposes it over a tiny local HTTP server, so the real TypeScript services can
//! call `invoke()` exactly as they do in the app. Every request goes through
//! Tauri's real IPC argument deserialization.
//!
//! Run with:
//!   cargo test ipc_bridge -- --ignored --nocapture
//! Environment:
//!   BUCKETSTACK_BRIDGE_PORT  (default 17321)
//!   BUCKETSTACK_TEST_DIR     isolated dir for activity.db / credentials.enc

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};

use serde_json::{json, Value};
use tauri::test::{get_ipc_response, mock_builder, INVOKE_KEY};
use tauri::Manager;
use tauri::Listener;

#[allow(unused_imports)]
use super::*;

type Events = Arc<Mutex<Vec<Value>>>;

fn invoke<W: AsRef<tauri::Webview<tauri::test::MockRuntime>>>(webview: &W, cmd: &str, args: Value) -> Value {
    let res = get_ipc_response(
        webview,
        tauri::webview::InvokeRequest {
            cmd: cmd.into(),
            callback: tauri::ipc::CallbackFn(0),
            error: tauri::ipc::CallbackFn(1),
            url: "tauri://localhost".parse().unwrap(),
            body: tauri::ipc::InvokeBody::Json(args),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        },
    );
    match res {
        Ok(body) => json!({ "ok": true, "value": body.deserialize::<Value>().unwrap_or(Value::Null) }),
        Err(e) => json!({ "ok": false, "error": e }),
    }
}

fn read_request(stream: &mut TcpStream) -> Option<(String, String, Vec<u8>)> {
    let mut reader = BufReader::new(stream.try_clone().ok()?);
    let mut request_line = String::new();
    reader.read_line(&mut request_line).ok()?;
    let mut parts = request_line.split_whitespace();
    let method = parts.next()?.to_string();
    let path = parts.next()?.to_string();
    let mut content_length = 0usize;
    loop {
        let mut line = String::new();
        reader.read_line(&mut line).ok()?;
        let line = line.trim_end();
        if line.is_empty() {
            break;
        }
        if let Some((k, v)) = line.split_once(':') {
            if k.eq_ignore_ascii_case("content-length") {
                content_length = v.trim().parse().unwrap_or(0);
            }
        }
    }
    let mut body = vec![0u8; content_length];
    reader.read_exact(&mut body).ok()?;
    Some((method, path, body))
}

fn respond(stream: &mut TcpStream, body: &Value) {
    let payload = body.to_string();
    let _ = write!(
        stream,
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        payload.len(),
        payload
    );
}

#[test]
#[ignore = "long-running bridge for the e2e suite; run explicitly"]
fn ipc_bridge() {
    let test_dir = std::env::var("BUCKETSTACK_TEST_DIR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir().join("bucketstack_e2e"));
    std::fs::create_dir_all(&test_dir).unwrap();

    // Isolated state: never touch the user's real credentials or activity log.
    crate::security::init_security_manager_for_test(test_dir.join("credentials.enc"));
    crate::init_activity_db_at(&test_dir.join("activity.db")).unwrap();

    let app = mock_builder()
        .invoke_handler(app_commands!())
        // Real tauri.conf.json + capabilities, so the production ACL is enforced too.
        .build(app_context())
        .expect("failed to build mock app");
    let webview = match app.get_webview_window("main") {
        Some(w) => w,
        None => tauri::WebviewWindowBuilder::new(&app, "main", Default::default()).build().unwrap(),
    };

    let events: Events = Arc::new(Mutex::new(Vec::new()));
    for name in ["transfer-progress", "upload-progress", "quick-upload"] {
        let events = events.clone();
        app.listen_any(name, move |event| {
            let payload: Value = serde_json::from_str(event.payload()).unwrap_or(Value::Null);
            events.lock().unwrap().push(json!({ "event": name, "payload": payload }));
        });
    }

    let port = std::env::var("BUCKETSTACK_BRIDGE_PORT").unwrap_or_else(|_| "17321".into());
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).unwrap();
    println!("BRIDGE READY on 127.0.0.1:{}", port);

    let webview = Arc::new(webview);
    for stream in listener.incoming() {
        let Ok(mut stream) = stream else { continue };
        let webview = webview.clone();
        let events = events.clone();
        std::thread::spawn(move || {
            let Some((method, path, body)) = read_request(&mut stream) else { return };
            let reply = match (method.as_str(), path.as_str()) {
                ("POST", "/invoke") => {
                    let req: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
                    let cmd = req["cmd"].as_str().unwrap_or_default().to_string();
                    let args = req.get("args").cloned().unwrap_or(json!({}));
                    invoke(webview.as_ref(), &cmd, args)
                }
                ("GET", "/events") => {
                    let drained: Vec<Value> = events.lock().unwrap().drain(..).collect();
                    json!(drained)
                }
                _ => json!({ "ok": false, "error": "unknown route" }),
            };
            respond(&mut stream, &reply);
        });
    }
}
