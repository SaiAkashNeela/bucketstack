# End-to-end tests

Drives the real frontend services (`services/*.ts`) through Tauri's real IPC
layer and capability ACL (`src/ipc_tests.rs`) into the real Rust commands,
against a local MinIO. Results are checked with Bun's own S3 client, not with
the code under test.

```bash
# 1. MinIO
docker run -d --name bucketstack-minio -p 9900:9000 -p 9901:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"

# 2. IPC bridge (keep running; uses an isolated temp dir for credentials/activity db)
cargo test ipc_bridge -- --ignored --nocapture

# 3. Suite
bun test --preload ./tests/e2e/setup.ts tests/e2e --timeout 120000
```

Each run creates and deletes its own `bs-e2e-*` buckets.
Env overrides: `BUCKETSTACK_TEST_ENDPOINT`, `BUCKETSTACK_TEST_KEY`,
`BUCKETSTACK_TEST_SECRET`, `BUCKETSTACK_BRIDGE_PORT`, `BUCKETSTACK_TEST_DIR`.
