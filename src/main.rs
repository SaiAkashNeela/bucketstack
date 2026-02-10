// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    command,
    generate_context,
    Emitter,
    Manager,
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    menu::MenuBuilder,
    image::Image,
    Position, PhysicalPosition
};

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json;
use aws_sdk_s3::Client as S3Client;
use aws_config::BehaviorVersion;
use walkdir::WalkDir;
use futures::stream::{self, StreamExt};
use std::path::Path;
use std::fs;
use rusqlite::{Connection, params};
use chrono::Utc;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::time::Instant;

mod security;

#[derive(Debug, Serialize, Deserialize)]
pub struct S3TestRequest {
    pub endpoint: String,
    pub region: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub test_bucket: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3TestResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub size: i64,
    pub last_modified: String,
    pub is_folder: bool,
    pub storage_class: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityLogEntry {
    pub id: Option<i64>,
    pub timestamp: String,
    pub connection_id: String,
    pub provider: String,
    pub bucket_name: String,
    pub action_type: String,
    pub object_path_before: Option<String>,
    pub object_path_after: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub file_size: Option<i64>,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransferProgress {
    #[serde(rename = "jobId")]
    pub job_id: String,
    #[serde(rename = "bytesTransferred")]
    pub bytes_transferred: u64,
    #[serde(rename = "totalBytes")]
    pub total_bytes: u64,
    pub speed: f64,
    pub status: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityLogFilters {
    pub connection_id: Option<String>,
    pub bucket: Option<String>,
    pub action_type: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListObjectsRequest {
    pub endpoint: String,
    pub region: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub bucket: String,
    pub prefix: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListObjectsResponse {
    pub success: bool,
    pub objects: Vec<S3Object>,
    pub message: String,
    pub next_continuation_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListObjectsRecursiveRequest {
    pub endpoint: String,
    pub region: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub bucket: String,
    pub prefix: String,
    pub continuation_token: Option<String>,
    pub max_keys: Option<i32>,
}

// ==================== Activity Logger Module ====================

// Global database connection (lazy initialized)
static ACTIVITY_DB: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

// Initialize activity log database
fn init_activity_db() -> Result<(), String> {
    let app_data_dir = if cfg!(target_os = "macos") {
        dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join("Library/Application Support/BucketStack")
    } else if cfg!(target_os = "windows") {
        dirs::data_dir()
            .ok_or("Could not find app data directory")?
            .join("BucketStack")
    } else {
        dirs::data_dir()
            .ok_or("Could not find app data directory")?
            .join("bucketstack")
    };

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    let db_path = app_data_dir.join("activity.db");
    
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Create table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            connection_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            bucket_name TEXT NOT NULL,
            action_type TEXT NOT NULL,
            object_path_before TEXT,
            object_path_after TEXT,
            status TEXT NOT NULL,
            error_message TEXT,
            file_size INTEGER,
            source TEXT DEFAULT 'BucketStack',
            metadata TEXT
        )",
        [],
    ).map_err(|e| format!("Failed to create table: {}", e))?;

    // Create indices
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_timestamp ON activity_log(timestamp DESC)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_connection ON activity_log(connection_id)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_action ON activity_log(action_type)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_status ON activity_log(status)",
        [],
    );

    // Store connection in global
    let mut db = ACTIVITY_DB.lock().unwrap();
    *db = Some(conn);

    Ok(())
}

// Log an activity entry (non-blocking, best effort)
fn log_activity(entry: ActivityLogEntry) {
    // Run in a separate task to avoid blocking
    std::thread::spawn(move || {
        if let Ok(mut db_guard) = ACTIVITY_DB.lock() {
            if let Some(conn) = db_guard.as_mut() {
                let _ = conn.execute(
                    "INSERT INTO activity_log (
                        timestamp, connection_id, provider, bucket_name, action_type,
                        object_path_before, object_path_after, status, error_message,
                        file_size, source
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                    params![
                        entry.timestamp,
                        entry.connection_id,
                        entry.provider,
                        entry.bucket_name,
                        entry.action_type,
                        entry.object_path_before,
                        entry.object_path_after,
                        entry.status,
                        entry.error_message,
                        entry.file_size,
                        entry.source,
                    ],
                );
            }
        }
    });
}

// Helper to check if logging is enabled for a connection
// This will be called from frontend with connection metadata
fn should_log_activity(connection_id: &str, enable_activity_log: bool) -> bool {
    !connection_id.is_empty() && enable_activity_log
}

// Query activity log with filters
#[command]
fn query_activity_log(
    filters: ActivityLogFilters,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<ActivityLogEntry>, String> {
    let db_guard = ACTIVITY_DB.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;

    let mut query = String::from("SELECT id, timestamp, connection_id, provider, bucket_name, action_type, object_path_before, object_path_after, status, error_message, file_size, source FROM activity_log WHERE 1=1");
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(conn_id) = &filters.connection_id {
        query.push_str(" AND connection_id = ?");
        params_vec.push(Box::new(conn_id.clone()));
    }
    if let Some(bucket) = &filters.bucket {
        query.push_str(" AND bucket_name = ?");
        params_vec.push(Box::new(bucket.clone()));
    }
    if let Some(action) = &filters.action_type {
        query.push_str(" AND action_type = ?");
        params_vec.push(Box::new(action.clone()));
    }
    if let Some(status) = &filters.status {
        query.push_str(" AND status = ?");
        params_vec.push(Box::new(status.clone()));
    }
    if let Some(start) = &filters.start_date {
        query.push_str(" AND timestamp >= ?");
        params_vec.push(Box::new(start.clone()));
    }
    if let Some(end) = &filters.end_date {
        query.push_str(" AND timestamp <= ?");
        params_vec.push(Box::new(end.clone()));
    }
    if let Some(search) = &filters.search {
        query.push_str(" AND (object_path_before LIKE ? OR object_path_after LIKE ?)");
        let search_pattern = format!("%{}%", search);
        params_vec.push(Box::new(search_pattern.clone()));
        params_vec.push(Box::new(search_pattern));
    }

    query.push_str(" ORDER BY timestamp DESC");
    
    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }
    if let Some(off) = offset {
        query.push_str(&format!(" OFFSET {}", off));
    }

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    
    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;
    
    let entries = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(ActivityLogEntry {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            connection_id: row.get(2)?,
            provider: row.get(3)?,
            bucket_name: row.get(4)?,
            action_type: row.get(5)?,
            object_path_before: row.get(6)?,
            object_path_after: row.get(7)?,
            status: row.get(8)?,
            error_message: row.get(9)?,
            file_size: row.get(10)?,
            source: row.get(11)?,
        })
    })
    .map_err(|e| format!("Failed to query: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect results: {}", e))?;

    Ok(entries)
}

// Export activity log
#[command]
fn export_activity_log(
    format: String,
    filters: Option<ActivityLogFilters>,
) -> Result<String, String> {
    let entries = query_activity_log(
        filters.unwrap_or(ActivityLogFilters {
            connection_id: None,
            bucket: None,
            action_type: None,
            status: None,
            start_date: None,
            end_date: None,
            search: None,
        }),
        None,
        None,
    )?;

    match format.as_str() {
        "json" => {
            serde_json::to_string_pretty(&entries)
                .map_err(|e| format!("Failed to serialize to JSON: {}", e))
        }
        "csv" => {
            let mut csv = String::from("Timestamp,Connection ID,Provider,Bucket,Action,Path Before,Path After,Status,Error,File Size\n");
            for entry in entries {
                csv.push_str(&format!(
                    "{},{},{},{},{},{},{},{},{},{}\n",
                    entry.timestamp,
                    entry.connection_id,
                    entry.provider,
                    entry.bucket_name,
                    entry.action_type,
                    entry.object_path_before.unwrap_or_default(),
                    entry.object_path_after.unwrap_or_default(),
                    entry.status,
                    entry.error_message.unwrap_or_default(),
                    entry.file_size.map(|s| s.to_string()).unwrap_or_default(),
                ));
            }
            Ok(csv)
        }
        _ => Err("Unsupported format".to_string()),
    }
}

// Clear activity log
#[command]
fn clear_activity_log(
    connection_id: Option<String>,
    before_date: Option<String>,
) -> Result<bool, String> {
    let db_guard = ACTIVITY_DB.lock().unwrap();
    let conn = db_guard.as_ref().ok_or("Database not initialized")?;

    let mut query = String::from("DELETE FROM activity_log WHERE 1=1");
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(conn_id) = connection_id {
        query.push_str(" AND connection_id = ?");
        params_vec.push(Box::new(conn_id));
    }
    if let Some(date) = before_date {
        query.push_str(" AND timestamp < ?");
        params_vec.push(Box::new(date));
    }

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    
    conn.execute(&query, params_refs.as_slice())
        .map_err(|e| format!("Failed to clear log: {}", e))?;

    Ok(true)
}

// Log activity entry (called from frontend)
#[command]
fn log_activity_entry(
    connection_id: String,
    provider: String,
    bucket_name: String,
    action_type: String,
    object_path_before: Option<String>,
    object_path_after: Option<String>,
    status: String,
    error_message: Option<String>,
    file_size: Option<i64>,
    enable_activity_log: bool,
) -> Result<bool, String> {
    if !should_log_activity(&connection_id, enable_activity_log) {
        return Ok(false);
    }

    let entry = ActivityLogEntry {
        id: None,
        timestamp: Utc::now().to_rfc3339(),
        connection_id,
        provider,
        bucket_name,
        action_type,
        object_path_before,
        object_path_after,
        status,
        error_message,
        file_size,
        source: "BucketStack".to_string(),
    };

    log_activity(entry);
    Ok(true)
}

// ==================== End Activity Logger Module ====================

// Helper to create S3 client
async fn create_s3_client(
    endpoint: &str,
    region: &str,
    access_key_id: &str,
    secret_access_key: &str,
) -> S3Client {
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.trim().to_string(),
        secret_access_key.trim().to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region.to_string()))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config_builder = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config_builder = s3_config_builder.endpoint_url(endpoint);
        s3_config_builder = s3_config_builder.force_path_style(true);
    }

    S3Client::from_conf(s3_config_builder.build())
}

// Test S3 connection from Rust backend (bypasses CORS)
#[command]
async fn test_s3_connection(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    test_bucket: String,
) -> Result<S3TestResponse, String> {
    // Trim credentials to remove whitespace
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    // Create AWS config with provided credentials
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region.clone()))
        .credentials_provider(credentials)
        .load()
        .await;

    // Create S3 client with custom endpoint if provided
    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint.clone());
        // For custom endpoints like R2, enable path-style addressing
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());

    // Try to list objects in the test bucket
    let _result = client
        .list_objects_v2()
        .bucket(&test_bucket)
        .max_keys(1)
        .send()
        .await
        .map_err(|e| format!("Failed to access bucket: {}", e))?;

    Ok(S3TestResponse {
        success: true,
        message: "Connection test successful".to_string(),
    })
}


#[command]
async fn list_objects(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    prefix: String,
) -> Result<ListObjectsResponse, String> {
    // Trim credentials to remove whitespace
    let access_key_id = access_key_id.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region.clone()))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint.clone());
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());

    let result = client
        .list_objects_v2()
        .bucket(&bucket)
        .prefix(&prefix)
        .delimiter("/")
        .send()
        .await
        .map_err(|e| {
            eprintln!("AWS S3 Error in list_objects: {:?}", e);
            format!("Failed to list objects: {:?}", e)
        })?;

    let mut objects = Vec::new();

    // Add common prefixes as folders
    let prefixes = result.common_prefixes();
    for prefix in prefixes {
        if let Some(prefix_str) = prefix.prefix() {
            objects.push(S3Object {
                key: prefix_str.to_string(),
                size: 0,
                last_modified: "".to_string(),
                is_folder: true,
                storage_class: None,
            });
        }
    }

    // Add objects
    let contents = result.contents();
    for obj in contents {
        if let Some(key) = obj.key() {
            objects.push(S3Object {
                key: key.to_string(),
                size: obj.size().unwrap_or(0),
                last_modified: obj.last_modified()
                    .map(|d| d.to_string())
                    .unwrap_or_else(|| "Unknown".to_string()),
                is_folder: false,
                storage_class: obj.storage_class().map(|s| s.as_str().to_string()),
            });
        }
    }

    Ok(ListObjectsResponse {
        success: true,
        objects,
        message: "Objects listed successfully".to_string(),
        next_continuation_token: result.next_continuation_token().map(|s| s.to_string()),
    })
}

#[command]
async fn list_objects_recursive(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    prefix: String,
    continuation_token: Option<String>,
    max_keys: Option<i32>,
) -> Result<ListObjectsResponse, String> {
    let access_key_id = access_key_id.trim();
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint.clone()).force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());

    let mut req = client
        .list_objects_v2()
        .bucket(&bucket)
        .prefix(&prefix);
    
    if let Some(token) = continuation_token {
        req = req.continuation_token(token);
    }
    
    if let Some(max) = max_keys {
        req = req.max_keys(max);
    }

    let result = req.send().await.map_err(|e| format!("Failed to list objects recursively: {}", e))?;

    let mut objects = Vec::new();
    let contents = result.contents();
    for obj in contents {
        if let Some(key) = obj.key() {
            objects.push(S3Object {
                key: key.to_string(),
                size: obj.size().unwrap_or(0),
                last_modified: obj.last_modified()
                    .map(|d| d.to_string())
                    .unwrap_or_else(|| "Unknown".to_string()),
                is_folder: key.ends_with('/'),
                storage_class: obj.storage_class().map(|s| s.as_str().to_string()),
            });
        }
    }

    Ok(ListObjectsResponse {
        success: true,
        objects,
        message: "Objects listed recursively".to_string(),
        next_continuation_token: result.next_continuation_token().map(|s| s.to_string()),
    })
}
#[command]
fn show_main_window(window: tauri::Window) {
    let _ = window.show();
    let _ = window.set_focus();
}

#[command]
fn hide_main_window(window: tauri::Window) {
    let _ = window.hide();
}

#[command]
fn quick_upload(window: tauri::Window) {
    let _ = window.emit("quick-upload", ());
}

#[command]
fn hide_tray(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("tray") {
        let _ = window.hide();
    }
}

#[command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

// Plugin commands handled by their own plugins
// ...

// --- Secure Storage Wrapper Commands ---

#[command]
fn save_secure_item(key: String, value: String) -> Result<(), String> {
    security::get_manager().set_item(key, value)
}

#[command]
fn get_secure_item(key: String) -> Result<Option<String>, String> {
    security::get_manager().get_item(&key)
}

#[command]
fn delete_secure_item(key: String) -> Result<(), String> {
    security::get_manager().remove_item(&key)
}

#[command]
async fn list_buckets(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
) -> Result<Vec<String>, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    let result = client
        .list_buckets()
        .send()
        .await
        .map_err(|e| format!("Failed to list buckets: {}", e))?;

    let buckets: Vec<String> = result
        .buckets()
        .iter()
        .filter_map(|b| b.name().map(|n| n.to_string()))
        .collect();

    Ok(buckets)
}

#[command]
async fn get_signed_url(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
    expires_in: u64,
) -> Result<String, String> {
    use aws_sdk_s3::presigning::PresigningConfig;
    use std::time::Duration;
    
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    let duration = if expires_in > 0 { expires_in } else { 3600 };

    let presigned_request = client
        .get_object()
        .bucket(&bucket)
        .key(&key)
        .response_content_disposition(format!("attachment; filename=\"{}\"", key.split('/').last().unwrap_or(&key)))
        .presigned(PresigningConfig::builder()
            .expires_in(Duration::from_secs(duration))
            .build()
            .map_err(|e| format!("Failed to build presigning config: {}", e))?)
        .await
        .map_err(|e| format!("Failed to create presigned request: {}", e))?;

    Ok(presigned_request.uri().to_string())
}

#[command]
async fn delete_object(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    client
        .delete_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to delete object: {}", e))?;

    Ok(true)
}

#[command]
async fn create_bucket(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    client
        .create_bucket()
        .bucket(&bucket)
        .send()
        .await
        .map_err(|e| format!("Failed to create bucket: {}", e))?;

    Ok(true)
}

#[command]
async fn delete_bucket(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    client
        .delete_bucket()
        .bucket(&bucket)
        .send()
        .await
        .map_err(|e| format!("Failed to delete bucket: {}", e))?;

    Ok(true)
}

// Create a folder by uploading a zero-byte object ending with /
#[command]
async fn create_folder(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    folder_path: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    // Ensure folder path ends with /
    let folder_key = if folder_path.ends_with('/') {
        folder_path
    } else {
        format!("{}/", folder_path)
    };
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    // Upload zero-byte object to create folder marker
    client
        .put_object()
        .bucket(&bucket)
        .key(&folder_key)
        .body(aws_sdk_s3::primitives::ByteStream::from_static(b""))
        .send()
        .await
        .map_err(|e| format!("Failed to create folder: {}", e))?;

    Ok(true)
}

// Rename object by copying to new key and deleting old one
#[command]
async fn rename_object(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    old_key: String,
    new_key: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    // Copy object to new key
    let copy_source = format!("{}/{}", bucket, old_key);
    client
        .copy_object()
        .bucket(&bucket)
        .copy_source(&copy_source)
        .key(&new_key)
        .send()
        .await
        .map_err(|e| format!("Failed to copy object: {}", e))?;
    
    // Delete old object
    client
        .delete_object()
        .bucket(&bucket)
        .key(&old_key)
        .send()
        .await
        .map_err(|e| format!("Failed to delete old object: {}", e))?;

    Ok(true)
}

// Upload a file to S3
#[command]
async fn upload_file(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
    body: Vec<u8>,
    content_type: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    // Upload file to S3
    client
        .put_object()
        .bucket(&bucket)
        .key(&key)
        .body(aws_sdk_s3::primitives::ByteStream::from(body))
        .content_type(&content_type)
        .send()
        .await
        .map_err(|e| format!("Failed to upload file: {}", e))?;

    Ok(true)
}

// Get file content as text (for editing)
#[command]
async fn get_file_content(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
) -> Result<String, String> {


    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    let result = client
        .get_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to get object: {}", e))?;

    let bytes = result.body.collect().await
        .map_err(|e| format!("Failed to read body: {}", e))?
        .into_bytes();

    let content = String::from_utf8(bytes.to_vec())
        .map_err(|e| format!("File content is not valid UTF-8: {}", e))?;

    Ok(content)
}



#[command]
async fn search_objects(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    query: String,
) -> Result<Vec<S3Object>, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());

    // Basic recursive search (not efficient for huge buckets, but okay for desktop app MVP)
    // We list all objects and filter by name. 
    // Optimization: In real world, use S3 Select or generic prefix if basic prefix match
    
    let mut matching_objects = Vec::new();
    let mut continuation_token: Option<String> = None;
    let lower_query = query.to_lowercase();

    // Limit to scanning first 2000 items to prevent hanging on massive buckets
    let mut scanned_count = 0;
    let max_scan = 5000; 

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(&bucket);
            
        if let Some(token) = continuation_token {
            req = req.continuation_token(token);
        }

        let result = req.send().await.map_err(|e| format!("Failed to search objects: {}", e))?;

        if let Some(contents) = result.contents {
            for obj in contents {
                scanned_count += 1;
                if let Some(key) = obj.key() {
                    let name = key.split('/').last().unwrap_or(key);
                    if name.to_lowercase().contains(&lower_query) {
                         matching_objects.push(S3Object {
                            key: key.to_string(),
                            size: obj.size.unwrap_or(0),
                            last_modified: obj.last_modified
                                .map(|d| d.to_string())
                                .unwrap_or_else(|| "Unknown".to_string()),
                            is_folder: key.ends_with('/'),
                            storage_class: obj.storage_class.as_ref().map(|s| s.as_str().to_string()),
                        });
                    }
                }
            }
        }
        
        if result.is_truncated.unwrap_or(false) && scanned_count < max_scan {
            continuation_token = result.next_continuation_token;
        } else {
            break;
        }
    }

    Ok(matching_objects)
}

// Calculate folder sizes recursively for immediate children
#[command]
async fn calculate_folder_size(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    prefix: String,
) -> Result<HashMap<String, i64>, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());

    // Recursively list all objects under the prefix
    let mut continuation_token: Option<String> = None;
    let mut sizes: HashMap<String, i64> = HashMap::new();

    loop {
        let mut req = client
            .list_objects_v2()
            .bucket(&bucket)
            .prefix(&prefix);
            
        if let Some(token) = continuation_token {
            req = req.continuation_token(token);
        }

        let result = req.send().await.map_err(|e| format!("Failed to list objects: {}", e))?;

        if let Some(contents) = result.contents {
            for obj in contents {
                if let Some(key) = obj.key() {
                    let size = obj.size.unwrap_or(0);
                    
                    // Skip if it doesn't start with prefix (shouldn't happen)
                    if !key.starts_with(&prefix) { continue; }
                    
                    // Get relative path
                    let relative_path = &key[prefix.len()..];
                    if relative_path.is_empty() { continue; }

                    // Check if it's inside a subfolder of the current prefix
                    // If relative path contains '/', the first part is the folder name
                    if let Some(idx) = relative_path.find('/') {
                        let folder_name = &relative_path[0..idx+1];
                        let full_folder_key = format!("{}{}", prefix, folder_name);
                        *sizes.entry(full_folder_key).or_insert(0) += size;
                    }
                }
            }
        }
        
        if result.is_truncated.unwrap_or(false) {
            continuation_token = result.next_continuation_token;
        } else {
            break;
        }
    }

    Ok(sizes)
}

// --- Multipart Upload Commands ---

#[command]
async fn create_multipart_upload(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
    content_type: String,
) -> Result<String, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }
    let client = S3Client::from_conf(s3_config.build());

    let result = client
        .create_multipart_upload()
        .bucket(&bucket)
        .key(&key)
        .content_type(&content_type)
        .send()
        .await
        .map_err(|e| format!("Failed to create multipart upload: {}", e))?;

    Ok(result.upload_id.ok_or("No upload ID returned")?)
}

#[command]
async fn upload_part(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
    upload_id: String,
    part_number: i32,
    body: Vec<u8>,
) -> Result<String, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }
    let client = S3Client::from_conf(s3_config.build());

    let result = client
        .upload_part()
        .bucket(&bucket)
        .key(&key)
        .upload_id(&upload_id)
        .part_number(part_number)
        .body(aws_sdk_s3::primitives::ByteStream::from(body))
        .send()
        .await
        .map_err(|e| format!("Failed to upload part: {}", e))?;

    Ok(result.e_tag.ok_or("No ETag returned")?.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletedPart {
    e_tag: String,
    part_number: i32,
}

#[command]
async fn complete_multipart_upload(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
    upload_id: String,
    parts: Vec<CompletedPart>,
) -> Result<bool, String> {
    use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart as S3CompletedPart};

    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }
    let client = S3Client::from_conf(s3_config.build());

    let mut completed_parts = Vec::new();
    for part in parts {
        completed_parts.push(
            S3CompletedPart::builder()
                .e_tag(part.e_tag)
                .part_number(part.part_number)
                .build(),
        );
    }

    let completed_upload = CompletedMultipartUpload::builder()
        .set_parts(Some(completed_parts))
        .build();

    client
        .complete_multipart_upload()
        .bucket(&bucket)
        .key(&key)
        .upload_id(&upload_id)
        .multipart_upload(completed_upload)
        .send()
        .await
        .map_err(|e| format!("Failed to complete multipart upload: {}", e))?;

    Ok(true)
}

#[command]
async fn abort_multipart_upload(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
    upload_id: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }
    let client = S3Client::from_conf(s3_config.build());

    client
        .abort_multipart_upload()
        .bucket(&bucket)
        .key(&key)
        .upload_id(&upload_id)
        .send()
        .await
        .map_err(|e| format!("Failed to abort multipart upload: {}", e))?;

    Ok(true)
}

// Copy a single file/object (like aws s3 cp)
#[command]
async fn copy_object_file(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    source_bucket: String,
    source_key: String,
    dest_bucket: String,
    dest_key: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint.clone());
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    // Copy single object
    let copy_source = format!("{}/{}", source_bucket, source_key);
    client
        .copy_object()
        .bucket(&dest_bucket)
        .copy_source(&copy_source)
        .key(&dest_key)
        .send()
        .await
        .map_err(|e| format!("Failed to copy object: {}", e))?;

    Ok(true)
}

// Copy a folder recursively (like aws s3 sync)
#[command]
async fn copy_objects_folder(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    source_bucket: String,
    source_prefix: String,
    dest_bucket: String,
    dest_prefix: String,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint.clone());
        s3_config = s3_config.force_path_style(true);
    }

    let client = S3Client::from_conf(s3_config.build());
    
    // List all objects in the source folder
    let mut continuation_token: Option<String> = None;

    loop {
        let mut list_req = client
            .list_objects_v2()
            .bucket(&source_bucket)
            .prefix(&source_prefix);
        
        if let Some(token) = continuation_token {
            list_req = list_req.continuation_token(token);
        }

        let result = list_req
            .send()
            .await
            .map_err(|e| format!("Failed to list objects: {}", e))?;

        // Copy all objects in this batch
        let contents = result.contents();
        for obj in contents {
            if let Some(key) = obj.key() {
                let key_str = key.to_string();
                // Calculate the destination key by replacing source prefix with dest prefix
                let relative_key = key_str.strip_prefix(&source_prefix).unwrap_or(&key_str);
                let dest_key = format!("{}{}", dest_prefix, relative_key);
                
                let copy_source = format!("{}/{}", source_bucket, key_str);
                client
                    .copy_object()
                    .bucket(&dest_bucket)
                    .copy_source(&copy_source)
                    .key(&dest_key)
                    .send()
                    .await
                    .map_err(|e| format!("Failed to copy object {}: {}", key_str, e))?;
            }
        }

        // Check if there are more results
        if result.is_truncated().unwrap_or(false) {
            continuation_token = result.next_continuation_token().map(|s| s.to_string());
        } else {
            break;
        }
    }

    Ok(true)
}

#[command]
async fn stream_transfer_object(
    window: tauri::Window,
    job_id: String,
    s_endpoint: String,
    s_region: String,
    s_access_key: String,
    s_secret_key: String,
    s_bucket: String,
    s_key: String,
    d_endpoint: String,
    d_region: String,
    d_access_key: String,
    d_secret_key: String,
    d_bucket: String,
    d_key: String,
) -> Result<bool, String> {
    let s_creds = aws_sdk_s3::config::Credentials::new(s_access_key.trim(), s_secret_key.trim(), None, None, "BucketStack");
    let d_creds = aws_sdk_s3::config::Credentials::new(d_access_key.trim(), d_secret_key.trim(), None, None, "BucketStack");

    let s_config = aws_config::defaults(BehaviorVersion::latest()).region(aws_config::Region::new(s_region)).credentials_provider(s_creds).load().await;
    let d_config = aws_config::defaults(BehaviorVersion::latest()).region(aws_config::Region::new(d_region)).credentials_provider(d_creds).load().await;

    let mut s_builder = aws_sdk_s3::config::Builder::from(&s_config);
    if !s_endpoint.is_empty() && s_endpoint != "https://s3.amazonaws.com" {
        s_builder = s_builder.endpoint_url(s_endpoint).force_path_style(true);
    }
    let s_client = S3Client::from_conf(s_builder.build());

    let mut d_builder = aws_sdk_s3::config::Builder::from(&d_config);
    if !d_endpoint.is_empty() && d_endpoint != "https://s3.amazonaws.com" {
        d_builder = d_builder.endpoint_url(d_endpoint).force_path_style(true);
    }
    let d_client = S3Client::from_conf(d_builder.build());

    let head = s_client.head_object().bucket(&s_bucket).key(&s_key).send().await
        .map_err(|e| format!("Failed to get source metadata: {}", e))?;
    let total_size = head.content_length().unwrap_or(0);

    let source_resp = s_client.get_object().bucket(&s_bucket).key(&s_key).send().await
        .map_err(|e| format!("Failed to start source stream: {}", e))?;
    
    let mut body_stream = source_resp.body;
    let start_time = Instant::now();
    let mut transferred: u64 = 0;

    if total_size > 5 * 1024 * 1024 {
        let multipart = d_client.create_multipart_upload().bucket(&d_bucket).key(&d_key).send().await
            .map_err(|e| format!("Failed to create multipart: {}", e))?;
        let upload_id = multipart.upload_id().unwrap_or_default();
        
        let mut part_number = 1;
        let mut completed_parts = Vec::new();
        let mut buffer = Vec::with_capacity(6 * 1024 * 1024);

        while let Some(chunk_res) = body_stream.next().await {
            let chunk = chunk_res.map_err(|e| format!("Stream error: {}", e))?;
            buffer.extend_from_slice(&chunk);
            transferred += chunk.len() as u64;

            let elapsed = start_time.elapsed().as_secs_f64();
            let speed = if elapsed > 0.0 { transferred as f64 / elapsed } else { 0.0 };
            let _ = window.emit("transfer-progress", TransferProgress {
                job_id: job_id.clone(),
                bytes_transferred: transferred,
                total_bytes: total_size as u64,
                speed,
                status: "active".to_string(),
                error: None,
            });

            if buffer.len() >= 5 * 1024 * 1024 {
                let part_resp = d_client.upload_part()
                    .bucket(&d_bucket).key(&d_key).upload_id(upload_id).part_number(part_number)
                    .body(buffer.clone().into()).send().await
                    .map_err(|e| format!("Part {} failed: {}", part_number, e))?;
                
                completed_parts.push(aws_sdk_s3::types::CompletedPart::builder()
                    .e_tag(part_resp.e_tag().unwrap_or_default()).part_number(part_number).build());
                
                part_number += 1;
                buffer.clear();
            }
        }

        if !buffer.is_empty() {
            let part_resp = d_client.upload_part()
                .bucket(&d_bucket).key(&d_key).upload_id(upload_id).part_number(part_number)
                .body(buffer.into()).send().await
                .map_err(|e| format!("Last part failed: {}", e))?;
            completed_parts.push(aws_sdk_s3::types::CompletedPart::builder()
                .e_tag(part_resp.e_tag().unwrap_or_default()).part_number(part_number).build());
        }

        let completed_upload = aws_sdk_s3::types::CompletedMultipartUpload::builder().set_parts(Some(completed_parts)).build();
        d_client.complete_multipart_upload().bucket(&d_bucket).key(&d_key).upload_id(upload_id).multipart_upload(completed_upload).send().await
            .map_err(|e| format!("Complete multipart failed: {}", e))?;
    } else {
        let body_bytes = body_stream.collect().await.map_err(|e| format!("Collect error: {}", e))?;
        d_client.put_object().bucket(&d_bucket).key(&d_key).body(body_bytes.into_bytes().into()).send().await
            .map_err(|e| format!("Put failed: {}", e))?;
        
        let _ = window.emit("transfer-progress", TransferProgress {
            job_id: job_id.clone(),
            bytes_transferred: total_size as u64,
            total_bytes: total_size as u64,
            speed: total_size as f64 / start_time.elapsed().as_secs_f64().max(0.1),
            status: "completed".to_string(),
            error: None,
        });
    }

    Ok(true)
}

// Compress objects to zip or tar.gz
#[command]
async fn compress_objects(
    bucket: String,
    keys: Vec<String>,
    prefix: String,
    format: String,
    access_key_id: String,
    secret_access_key: String,
    region: String,
) -> Result<bool, String> {
    use std::io::Write;
    use std::fs::File;

    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();

    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let s3_config = aws_sdk_s3::config::Builder::from(&config).build();
    let client = S3Client::from_conf(s3_config);

    // Determine archive name and create temp directory
    let archive_name = if format == "tar.gz" {
        "archive.tar.gz"
    } else {
        "archive.zip"
    };

    let temp_dir = std::env::temp_dir().join("bucketstack_compress");
    let _ = std::fs::create_dir_all(&temp_dir);

    // Download objects to temp directory
    for key in &keys {
        let file_name = key.split('/').last().unwrap_or("file");
        let local_path = temp_dir.join(file_name);

        let obj = client
            .get_object()
            .bucket(&bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| format!("Failed to download {}: {}", key, e))?;

        let body = obj.body.collect().await
            .map_err(|e| format!("Failed to read body for {}: {}", key, e))?;

        let mut file = File::create(&local_path)
            .map_err(|e| format!("Failed to create file {}: {}", file_name, e))?;
        file.write_all(&body.into_bytes())
            .map_err(|e| format!("Failed to write file {}: {}", file_name, e))?;
    }

    // Create archive
    let archive_path = temp_dir.join(archive_name);

    if format == "tar.gz" {
        // Create tar.gz using system command
        let output = std::process::Command::new("tar")
            .args(&["-czf", archive_name, "-C", temp_dir.to_str().unwrap()])
            .args(
                keys.iter()
                    .map(|k| k.split('/').last().unwrap_or("file"))
                    .collect::<Vec<_>>()
            )
            .current_dir(&temp_dir)
            .output()
            .map_err(|e| format!("Failed to create tar.gz: {}", e))?;

        if !output.status.success() {
            return Err(format!("tar command failed: {}", String::from_utf8_lossy(&output.stderr)));
        }
    } else {
        // Create zip using zip crate
        let file = File::create(&archive_path)
            .map_err(|e| format!("Failed to create zip file: {}", e))?;

        let mut zip = zip::ZipWriter::new(file);

        for key in &keys {
            let file_name = key.split('/').last().unwrap_or("file");
            let local_path = temp_dir.join(file_name);

            let file_data = std::fs::read(&local_path)
                .map_err(|e| format!("Failed to read file {}: {}", file_name, e))?;

            zip.start_file(file_name, zip::write::FileOptions::default())
                .map_err(|e| format!("Failed to add file to zip: {}", e))?;
            zip.write_all(&file_data)
                .map_err(|e| format!("Failed to write to zip: {}", e))?;
        }

        zip.finish()
            .map_err(|e| format!("Failed to finalize zip: {}", e))?;
    }

    // Upload archive to S3
    let archive_data = std::fs::read(&archive_path)
        .map_err(|e| format!("Failed to read archive: {}", e))?;

    let archive_key = format!("{}archive.{}", 
        if prefix.is_empty() { "".to_string() } else { format!("{}/", prefix.trim_end_matches('/')) },
        if format == "tar.gz" { "tar.gz" } else { "zip" }
    );

    client
        .put_object()
        .bucket(&bucket)
        .key(&archive_key)
        .body(aws_sdk_s3::primitives::ByteStream::from(archive_data))
        .send()
        .await
        .map_err(|e| format!("Failed to upload archive: {}", e))?;

    // Cleanup temp files
    let _ = std::fs::remove_file(&archive_path);
    for key in &keys {
        let file_name = key.split('/').last().unwrap_or("file");
        let _ = std::fs::remove_file(temp_dir.join(file_name));
    }

    Ok(true)
}

// ... (Multipart commands above)

#[command]
async fn copy_object(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    source_key: String,
    dest_key: String,
    metadata: Option<HashMap<String, String>>,
) -> Result<bool, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }
    let client = S3Client::from_conf(s3_config.build());

    // Source must be URL encoded if it contains special characters, but AWS SDK usually handles this if we pass raw key?
    // The copy_source parameter expects "bucket/key". Key should be URI encoded.
    // Rust URL encoding can be done with `urlencoding::encode`. 
    // However, for MVP let's assume keys are simple or simple encoding. 
    // Note: standard S3 `copy_source` format is `bucket/key`.
    
    // Simple encoding of the key part
    let encoded_source_key = urlencoding::encode(&source_key);
    let copy_source = format!("{}/{}", bucket, encoded_source_key);
    
    let mut req = client
        .copy_object()
        .bucket(&bucket)
        .copy_source(copy_source)
        .key(&dest_key);

    if let Some(meta) = metadata {
       req = req.metadata_directive(aws_sdk_s3::types::MetadataDirective::Replace);
       for (k, v) in meta {
           req = req.metadata(k, v);
       }
    }

    req.send()
        .await
        .map_err(|e| format!("Failed to copy object: {}", e))?;

    Ok(true)
}

#[command]
async fn head_object(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
) -> Result<HashMap<String, String>, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint);
        s3_config = s3_config.force_path_style(true);
    }
    let client = S3Client::from_conf(s3_config.build());

    let result = client
        .head_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to get object metadata: {}", e))?;

    let mut meta = HashMap::new();
    if let Some(m) = result.metadata {
        for (k, v) in m {
            meta.insert(k, v);
        }
    }
    
    // Add Last-Modified as a special metadata field for frontend to use in Expiry calculation
    if let Some(lm) = result.last_modified {
        meta.insert("Last-Modified".to_string(), lm.to_string());
    }

    Ok(meta)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncStats {
    pub files_scanned: usize,
    pub files_transferred: usize,
    pub bytes_transferred: u64,
    pub errors: Vec<String>,
}

#[command]
async fn sync_folder(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    local_path: String,
    remote_path: String, // Prefix in S3
    direction: String, // "up" (Local->S3) or "down" (S3->Local)
    mirror_sync: bool, // If true, delete destination files not in source
) -> Result<SyncStats, String> {
    let access_key_id = access_key_id.trim();
    let secret_access_key = secret_access_key.trim();
    
    let credentials = aws_sdk_s3::config::Credentials::new(
        access_key_id.to_string(),
        secret_access_key.to_string(),
        None,
        None,
        "BucketStack",
    );

    let config = aws_config::defaults(BehaviorVersion::latest())
        .region(aws_config::Region::new(region.clone()))
        .credentials_provider(credentials)
        .load()
        .await;

    let mut s3_config = aws_sdk_s3::config::Builder::from(&config);
    if !endpoint.is_empty() && endpoint != "https://s3.amazonaws.com" {
        s3_config = s3_config.endpoint_url(endpoint.clone());
        s3_config = s3_config.force_path_style(true);
    }
    let client = S3Client::from_conf(s3_config.build());

    // Normalize S3 Prefix (ensure ends with / if not empty)
    let prefix = if remote_path.is_empty() || remote_path == "/" { 
        "".to_string() 
    } else if remote_path.ends_with('/') {
        remote_path.clone()
    } else {
        format!("{}/", remote_path)
    };

    let mut stats = SyncStats { files_scanned: 0, files_transferred: 0, bytes_transferred: 0, errors: vec![] };

    // --- UPLOAD (Local -> S3) ---
    if direction == "up" {
        // 1. List Remote Objects for comparison (Map: RelativeKey -> Size)
        let mut remote_map = HashMap::new();
        let mut continuation_token = None;
        
        loop {
            let mut req = client.list_objects_v2().bucket(&bucket).prefix(&prefix);
            if let Some(token) = continuation_token { req = req.continuation_token(token); }
            let resp = req.send().await.map_err(|e| e.to_string())?;
            
            if let Some(contents) = resp.contents {
                for obj in contents {
                    if let Some(key) = obj.key() {
                        if let Some(rel) = key.strip_prefix(&prefix) {
                             if !rel.is_empty() {
                                 remote_map.insert(rel.to_string(), obj.size.unwrap_or(0));
                             }
                        } else {
                             // Exact match or something?
                             remote_map.insert(key.to_string(), obj.size.unwrap_or(0));
                        }
                    }
                }
            }
            if resp.is_truncated.unwrap_or(false) { continuation_token = resp.next_continuation_token; } else { break; }
        }

        // 2. Walk Local
        let mut tasks = Vec::new();
        for entry in WalkDir::new(&local_path).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                stats.files_scanned += 1;
                let path = entry.path();
                // Relative path logic
                match path.strip_prefix(&local_path) {
                    Ok(rel_path) => {
                         let rel_str = rel_path.to_string_lossy().replace("\\", "/");
                         let s3_key = format!("{}{}", prefix, rel_str);
                         
                         // Check size
                         let metadata = match std::fs::metadata(path) {
                             Ok(m) => m,
                             Err(_) => continue,
                         };
                         let size = metadata.len() as i64;
                         
                         // Compare with remote map (using rel_str as key relative to prefix)
                         // Wait, map keys are relative if I stripped prefix? Yes.
                         // But map insert above used stripped key?
                         // "if let Some(rel) = key.strip_prefix(&prefix)"
                         // Yes.
                         
                         let needs_upload = match remote_map.get(&rel_str) {
                             Some(&remote_size) => size != remote_size,
                             None => true,
                         };

                         if needs_upload {
                             let client = client.clone();
                             let bucket = bucket.clone();
                             let key = s3_key;
                             let path_buf = path.to_path_buf();
                             
                             tasks.push(async move {
                                 match aws_sdk_s3::primitives::ByteStream::from_path(&path_buf).await {
                                     Ok(stream) => {
                                         match client.put_object().bucket(&bucket).key(&key).body(stream).send().await {
                                             Ok(_) => Ok(size as u64),
                                             Err(e) => Err(format!("Upload failed for {}: {}", key, e)),
                                         }
                                     },
                                     Err(e) => Err(format!("File read failed {}: {}", key, e)),
                                 }
                             });
                         }
                    },
                    Err(_) => continue,
                }
            }
        }
        
        // Execute uploads (concurrency 5)
        let results = stream::iter(tasks).buffer_unordered(5).collect::<Vec<_>>().await;
        for res in results {
            match res {
                Ok(bytes) => { stats.files_transferred += 1; stats.bytes_transferred += bytes; },
                Err(e) => stats.errors.push(e),
            }
        }

        // Mirror Sync: Delete remote files not in local
        if mirror_sync {
            let mut delete_tasks = Vec::new();
            for (rel_str, _) in remote_map.iter() {
                // Check if this file exists in local
                let local_file_path = Path::new(&local_path).join(rel_str);
                if !local_file_path.exists() {
                    let client = client.clone();
                    let bucket = bucket.clone();
                    let key = format!("{}{}", prefix, rel_str);
                    
                    delete_tasks.push(async move {
                        match client.delete_object().bucket(&bucket).key(&key).send().await {
                            Ok(_) => Ok(()),
                            Err(e) => Err(format!("Delete failed for {}: {}", key, e)),
                        }
                    });
                }
            }
            
            // Execute deletes (concurrency 5)
            let delete_results = stream::iter(delete_tasks).buffer_unordered(5).collect::<Vec<_>>().await;
            for res in delete_results {
                match res {
                    Ok(_) => stats.files_transferred += 1,
                    Err(e) => stats.errors.push(e),
                }
            }
        }

    } 
    // --- DOWNLOAD (S3 -> Local) ---
    // TODO: Future Feature - Bucket to Local Sync
    // This feature is currently implemented but not enabled in the UI.
    // It will be made available in a future release pending:
    // - Cross-platform testing (macOS, Windows, Linux)
    // - Permission handling edge cases
    // - User feedback and validation
    else if direction == "down" {
         // Create local directory if it doesn't exist
         if let Err(e) = fs::create_dir_all(&local_path) {
             return Err(format!("Failed to create local directory: {}", e));
         }

         // 1. Walk Local (Map: RelativePath -> Size)
         let mut local_map = HashMap::new();
         for entry in WalkDir::new(&local_path).into_iter().filter_map(|e| e.ok()) {
             if entry.file_type().is_file() {
                 let path = entry.path();
                 if let Ok(rel_path) = path.strip_prefix(&local_path) {
                     let rel_str = rel_path.to_string_lossy().replace("\\", "/");
                     if let Ok(m) = std::fs::metadata(path) {
                         local_map.insert(rel_str, m.len() as i64);
                     }
                 }
             }
         }

         // 2. List Remote Objects (Map: RelativeKey -> Size)
         let mut remote_map = HashMap::new();
         let mut continuation_token = None;
         
         loop {
            let mut req = client.list_objects_v2().bucket(&bucket).prefix(&prefix);
            if let Some(token) = continuation_token { req = req.continuation_token(token); }
            let resp = req.send().await.map_err(|e| e.to_string())?;
            
            if let Some(contents) = resp.contents {
                for obj in contents {
                    if let Some(key) = obj.key() {
                        if let Some(rel) = key.strip_prefix(&prefix) {
                            if !rel.is_empty() {
                                remote_map.insert(rel.to_string(), obj.size.unwrap_or(0));
                            }
                        }
                    }
                }
            }
             if resp.is_truncated.unwrap_or(false) { continuation_token = resp.next_continuation_token; } else { break; }
         }

         // 3. Download Remote Files
         let mut tasks = Vec::new();
         let mut continuation_token = None;
         
         loop {
            let mut req = client.list_objects_v2().bucket(&bucket).prefix(&prefix);
            if let Some(token) = continuation_token { req = req.continuation_token(token); }
            let resp = req.send().await.map_err(|e| e.to_string())?;
            
            if let Some(contents) = resp.contents {
                for obj in contents {
                    stats.files_scanned += 1;
                    if let Some(key) = obj.key() {
                        if key.ends_with('/') { continue; } // Skip folders
                        
                        if let Some(rel) = key.strip_prefix(&prefix) {
                            let rel_str = rel.to_string();
                            let size = obj.size.unwrap_or(0);
                            
                            let needs_download = match local_map.get(&rel_str) {
                                Some(&local_size) => size != local_size,
                                None => true,
                            };
                            
                            if needs_download {
                                let client = client.clone();
                                let bucket = bucket.clone();
                                let key_str = key.to_string();
                                let dest_path = Path::new(&local_path).join(rel_str);
                                
                                tasks.push(async move {
                                    // Ensure parent dir exists
                                    if let Some(parent) = dest_path.parent() {
                                        let _ = fs::create_dir_all(parent);
                                    }
                                    
                                    match client.get_object().bucket(&bucket).key(&key_str).send().await {
                                        Ok(output) => {
                                            match output.body.collect().await {
                                                Ok(bytes) => {
                                                     match fs::write(&dest_path, bytes.into_bytes()) {
                                                         Ok(_) => Ok(size as u64),
                                                         Err(e) => Err(format!("Write failed {}: {}", key_str, e))
                                                     }
                                                },
                                                Err(e) => Err(format!("Stream failed {}: {}", key_str, e))
                                            }
                                        },
                                        Err(e) => Err(format!("Get failed {}: {}", key_str, e))
                                    }
                                });
                            }
                        }
                    }
                }
            }
             if resp.is_truncated.unwrap_or(false) { continuation_token = resp.next_continuation_token; } else { break; }
         }
         
         // Execute downloads
         let results = stream::iter(tasks).buffer_unordered(5).collect::<Vec<_>>().await;
         for res in results {
            match res {
                Ok(bytes) => { stats.files_transferred += 1; stats.bytes_transferred += bytes; },
                Err(e) => stats.errors.push(e),
            }
        }

        // Mirror Sync: Delete local files not in remote
        if mirror_sync {
            for (rel_str, _) in local_map.iter() {
                // Check if this file exists in remote
                if !remote_map.contains_key(rel_str) {
                    let local_file_path = Path::new(&local_path).join(rel_str);
                    match fs::remove_file(&local_file_path) {
                        Ok(_) => stats.files_transferred += 1,
                        Err(e) => stats.errors.push(format!("Delete failed for {}: {}", local_file_path.display(), e)),
                    }
                }
            }
        }
    }

    Ok(stats)
}

#[command]
async fn upload_paths(
    window: tauri::Window,
    account_id: String,
    provider: String,
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    prefix: String,
    paths: Vec<String>,
    enable_activity_log: bool,
) -> Result<(), String> {
    let client = create_s3_client(&endpoint, &region, &access_key_id, &secret_access_key).await;

    for path_str in paths {
        let path = Path::new(&path_str);
        if !path.exists() {
            continue;
        }

        if path.is_file() {
            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("unknown");
            let key = format!("{}{}", prefix, name);
            upload_single_file_task(
                &window,
                &client,
                &account_id,
                &provider,
                &bucket,
                &key,
                path,
                enable_activity_log,
            ).await?;
        } else if path.is_dir() {
            let entries: Vec<_> = WalkDir::new(path).into_iter().filter_map(|e| e.ok()).collect();
            for entry in entries {
                if entry.file_type().is_file() {
                    let rel_path = entry.path().strip_prefix(path.parent().unwrap()).unwrap();
                    let rel_key = rel_path.to_str().unwrap().replace("\\", "/");
                    let key = format!("{}{}", prefix, rel_key);
                    upload_single_file_task(
                        &window,
                        &client,
                        &account_id,
                        &provider,
                        &bucket,
                        &key,
                        entry.path(),
                        enable_activity_log,
                    ).await?;
                }
            }
        }
    }

    Ok(())
}

async fn upload_single_file_task(
    window: &tauri::Window,
    client: &aws_sdk_s3::Client,
    account_id: &str,
    provider: &str,
    bucket: &str,
    key: &str,
    path: &Path,
    enable_activity_log: bool,
) -> Result<(), String> {
    let body = fs::read(path).map_err(|e| format!("Failed to read file {}: {}", path.display(), e))?;
    let size = body.len() as u64;

    // Emit starting event
    let _ = window.emit("upload-progress", serde_json::json!({
        "fileName": key,
        "progress": 0,
        "status": "uploading",
        "size": size
    }));

    let result = client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(body.into())
        .send()
        .await;

    match result {
        Ok(_) => {
            // Emit completion event
            let _ = window.emit("upload-progress", serde_json::json!({
                "fileName": key,
                "progress": 100,
                "status": "completed",
                "size": size
            }));

            // Log activity
            let _ = log_activity_entry(
                account_id.to_string(),
                provider.to_string(),
                bucket.to_string(),
                "upload".to_string(),
                None,
                Some(key.to_string()),
                "success".to_string(),
                None,
                Some(size as i64),
                enable_activity_log,
            );

            Ok(())
        }
        Err(e) => {
            let error_msg = format!("Failed to upload {}: {}", key, e);
            
            // Emit error event
            let _ = window.emit("upload-progress", serde_json::json!({
                "fileName": key,
                "progress": 0,
                "status": "error",
                "size": size
            }));

            // Log activity
            let _ = log_activity_entry(
                account_id.to_string(),
                provider.to_string(),
                bucket.to_string(),
                "upload".to_string(),
                None,
                Some(key.to_string()),
                "failed".to_string(),
                Some(e.to_string()),
                Some(size as i64),
                enable_activity_log,
            );

            Err(error_msg)
        }
    }
}

#[command]
async fn download_file_to_path(
    endpoint: String,
    region: String,
    access_key_id: String,
    secret_access_key: String,
    bucket: String,
    key: String,
    path: String,
) -> Result<(), String> {
    let client = create_s3_client(&endpoint, &region, &access_key_id, &secret_access_key).await;
    
    let output = client.get_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to get object from S3: {}", e))?;

    let mut body = output.body;
    let mut file = fs::File::create(&path).map_err(|e| format!("Failed to create local file: {}", e))?;

    while let Some(chunk) = body.next().await {
        let data = chunk.map_err(|e| format!("Error while streaming from S3: {}", e))?;
        use std::io::Write;
        file.write_all(&data).map_err(|e| format!("Failed to write to local file: {}", e))?;
    }

    Ok(())
}

#[command]
async fn reset_application(_app: tauri::AppHandle) -> Result<bool, String> {
    println!("Starting full application reset...");

    // 1. Close and delete the activity database
    {
        let mut db_guard = ACTIVITY_DB.lock().unwrap();
        *db_guard = None; // Drop the connection
    }

    // 2. Resolve target directories using ProjectDirs (same as security.rs)
    if let Some(proj_dirs) = directories::ProjectDirs::from("com", "bucketstack", "app") {
        let config_dir = proj_dirs.config_dir();
        if config_dir.exists() {
            println!("Deleting application configuration directory: {:?}", config_dir);
            if let Err(e) = fs::remove_dir_all(config_dir) {
                eprintln!("Failed to delete config directory: {}", e);
            }
        }
        
        // Also check for the data directory if it's different
        let data_dir = proj_dirs.data_dir();
        if data_dir.exists() && data_dir != config_dir {
            println!("Deleting application data directory: {:?}", data_dir);
            if let Err(e) = fs::remove_dir_all(data_dir) {
                eprintln!("Failed to delete data directory: {}", e);
            }
        }
    }

    // 3. Fallback/Legacy directory deletion
    // Previously used "BucketStack" or "bucketstack"
    let legacy_dirs = vec!["BucketStack", "bucketstack"];
    for dir in legacy_dirs {
        if let Some(base_dir) = dirs::data_dir() {
            let path = base_dir.join(dir);
            if path.exists() {
                let _ = fs::remove_dir_all(path);
            }
        }
    }

    Ok(true)
}


fn main() {
    // Initialize security manager
    security::init_security_manager();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            // Secure Storage Commands
            save_secure_item,
            get_secure_item,
            delete_secure_item,

            show_main_window,
            hide_main_window,
            quick_upload,
            quit_app,
            hide_tray,
            test_s3_connection,
            list_objects,
            list_buckets,
            list_objects_recursive,
            get_signed_url,
            delete_object,
            create_bucket,
            delete_bucket,
            create_folder,
            rename_object,
            upload_file,
            copy_object_file,
            copy_objects_folder,
            stream_transfer_object,
            compress_objects,
            get_file_content,
            search_objects,
            create_multipart_upload,
            upload_part,
            complete_multipart_upload,
            abort_multipart_upload,
            copy_object,
            head_object,
            calculate_folder_size,
            sync_folder,
            query_activity_log,
            export_activity_log,
            clear_activity_log,
            log_activity_entry,
            download_file_to_path,
            upload_paths,
            reset_application
        ])
        .setup(|app| {
            // Initialize activity log database
            if let Err(e) = init_activity_db() {
                eprintln!("Failed to initialize activity log database: {}", e);
            }

            // Updater plugin (desktop: check for updates from configured endpoints)
            #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
            if let Err(e) = app.handle().plugin(tauri_plugin_updater::Builder::new().build()) {
                eprintln!("Warning: Failed to initialize updater plugin: {}", e);
            }

            // Ensure the main window is visible
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }

            // Fix black border on macOS tray window: disable native window shadow.
            // Transparent undecorated windows on macOS often show a dark border from the default shadow.
            #[cfg(target_os = "macos")]
            if let Some(tray_window) = app.get_webview_window("tray") {
                let _ = tray_window.set_shadow(false);
            }

            // Create system tray menu for macOS
            #[cfg(target_os = "macos")]
            {
                // Build main menu
                let menu = MenuBuilder::new(app)
                    .text("show", "Show BucketStack")
                    .text("hide", "Hide BucketStack")
                    .separator()
                    .text("quit", "Quit BucketStack")
                    .build()?;

                let tray = TrayIconBuilder::with_id("tray")
                    .icon(Image::from_bytes(include_bytes!("../icons/icon-tray-trimmed.png")).expect("icon not found"))
                    .icon_as_template(true)
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        
                        // Only handle left click release (button up) to avoid requiring hold
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            rect,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("tray") {
                                // Toggle window visibility
                                if let Ok(is_visible) = window.is_visible() {
                                    if is_visible {
                                        let _ = window.hide();
                                    } else {
                                        // Manual Positioning
                                        // Use scale factor to ensure correct physical pixel alignment
                                        if let Ok(scale) = window.scale_factor() {
                                            let win_width = 320.0 * scale; 
                                            
                                            // Extract icon position and size safely from enums
                                            let (icon_x, icon_y) = match rect.position {
                                                tauri::Position::Physical(pos) => (pos.x as f64, pos.y as f64),
                                                tauri::Position::Logical(pos) => (pos.x * scale, pos.y * scale),
                                            };

                                            let (icon_width, icon_height) = match rect.size {
                                                tauri::Size::Physical(size) => (size.width as f64, size.height as f64),
                                                tauri::Size::Logical(size) => (size.width * scale, size.height * scale),
                                            };

                                            // Center X relative to icon
                                            let icon_center = icon_x + (icon_width / 2.0);
                                            let x = icon_center - (win_width / 2.0);
                                            let y = icon_y + icon_height;
                                            
                                            let _ = window.set_position(Position::Physical(PhysicalPosition { x: x as i32, y: y as i32 }));
                                        }

                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                        }
                    })
                    .build(app)?;
                
                // CRITICAL: Persist the tray handle so it doesn't get dropped and remove the icon
                app.manage(tray);

            }

            Ok(())
        })
        .run(generate_context!())
        .expect("error while running tauri application");
}
