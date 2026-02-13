use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use directories::ProjectDirs;
use machine_uid;
use aes_gcm::aead::rand_core::RngCore;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

// Hardcoded salt to mix with machine ID
// WARNING: Changing this will invalidate all existing encrypted data on all machines
const APP_SALT: &str = "bucketstack-secure-storage-v1-salt-8x92m4";
const CREDENTIALS_FILE: &str = "credentials.enc";

pub struct SecurityManager {
    key: [u8; 32], // AES-256 Key
    file_path: PathBuf,
}

impl SecurityManager {
    pub fn new() -> Self {
        let key = Self::derive_key();
        let file_path = Self::get_credentials_path();
        Self { key, file_path }
    }

    fn derive_key() -> [u8; 32] {
        // Get unique machine ID
        let machine_id = machine_uid::get().unwrap_or_else(|_| {
            eprintln!("⚠️ Failed to get machine ID, falling back to static ID (INSECURE if purely relied upon)");
            "fallback-machine-id-bucketstack".to_string()
        });

        // Mix with application salt
        let mut hasher = Sha256::new();
        hasher.update(machine_id.as_bytes());
        hasher.update(APP_SALT.as_bytes());
        
        hasher.finalize().into()
    }

    fn get_credentials_path() -> PathBuf {
        if let Some(proj_dirs) = ProjectDirs::from("com", "bucketstack", "app") {
            let config_dir = proj_dirs.config_dir();
            if !config_dir.exists() {
                let _ = fs::create_dir_all(config_dir);
            }
            config_dir.join(CREDENTIALS_FILE)
        } else {
             // Fallback to local execution dir if getting system paths fails
            PathBuf::from(CREDENTIALS_FILE)
        }
    }

    // Encrypts the entire credentials map and saves to disk
    fn save_map(&self, map: &HashMap<String, String>) -> Result<(), String> {
        let json = serde_json::to_string(map).map_err(|e| e.to_string())?;
        let plaintext = json.as_bytes();

        let cipher = Aes256Gcm::new(&self.key.into());
        
        // Generate a random nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = cipher.encrypt(nonce, plaintext)
            .map_err(|e| format!("Encryption failed: {:?}", e))?;

        // Format: Nonce (12 bytes) + Ciphertext
        let mut final_blob = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
        final_blob.extend_from_slice(&nonce_bytes);
        final_blob.extend_from_slice(&ciphertext);

        // Save to file
        fs::write(&self.file_path, final_blob)
            .map_err(|e| format!("Failed to write credentials file: {}", e))?;

        Ok(())
    }

    // Loads and decrypts the credentials map
    fn load_map(&self) -> Result<HashMap<String, String>, String> {
        if !self.file_path.exists() {
            return Ok(HashMap::new());
        }

        let file_content = match fs::read(&self.file_path) {
            Ok(content) => content,
            Err(e) => {
                // If we can't read the file, just start fresh
                eprintln!("Warning: Failed to read credentials file, starting fresh: {}", e);
                return Ok(HashMap::new());
            }
        };

        if file_content.len() < 12 {
            // Invalid file, delete it and start fresh
            eprintln!("Warning: Invalid credentials file (too short), removing and starting fresh");
            let _ = fs::remove_file(&self.file_path);
            return Ok(HashMap::new());
        }

        // Extract nonce and ciphertext
        let (nonce_bytes, ciphertext) = file_content.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let cipher = Aes256Gcm::new(&self.key.into());

        // Decrypt
        let plaintext = match cipher.decrypt(nonce, ciphertext) {
            Ok(data) => data,
            Err(e) => {
                // Decryption failed - likely machine ID changed or file corrupted
                // Delete the corrupted file and start fresh
                eprintln!("Warning: Failed to decrypt credentials (machine ID may have changed), removing corrupted file and starting fresh: {:?}", e);
                let _ = fs::remove_file(&self.file_path);
                return Ok(HashMap::new());
            }
        };

        let json = match String::from_utf8(plaintext) {
            Ok(s) => s,
            Err(_) => {
                // Invalid UTF-8, delete and start fresh
                eprintln!("Warning: Invalid UTF-8 in credentials file, removing and starting fresh");
                let _ = fs::remove_file(&self.file_path);
                return Ok(HashMap::new());
            }
        };

        let map: HashMap<String, String> = match serde_json::from_str(&json) {
            Ok(m) => m,
            Err(e) => {
                // Invalid JSON, delete and start fresh
                eprintln!("Warning: Invalid JSON in credentials file, removing and starting fresh: {}", e);
                let _ = fs::remove_file(&self.file_path);
                return Ok(HashMap::new());
            }
        };

        Ok(map)
    }

    pub fn set_item(&self, key: String, value: String) -> Result<(), String> {
        let mut map = self.load_map().unwrap_or_else(|_| HashMap::new());
        map.insert(key, value);
        self.save_map(&map)
    }

    pub fn get_item(&self, key: &str) -> Result<Option<String>, String> {
        let map = self.load_map()?;
        Ok(map.get(key).cloned())
    }

    pub fn remove_item(&self, key: &str) -> Result<(), String> {
        let mut map = self.load_map()?;
        if map.contains_key(key) {
            map.remove(key);
            self.save_map(&map)?;
        }
        Ok(())
    }
}

// Global singleton helper
pub static SECURITY_MANAGER: std::sync::OnceLock<Mutex<SecurityManager>> = std::sync::OnceLock::new();

pub fn init_security_manager() {
    SECURITY_MANAGER.get_or_init(|| Mutex::new(SecurityManager::new()));
}

pub fn get_manager() -> std::sync::MutexGuard<'static, SecurityManager> {
    SECURITY_MANAGER.get().expect("Security manager not initialized").lock().unwrap()
}
