// End-to-end tests: real frontend services -> real Tauri IPC/ACL -> real Rust
// commands -> MinIO. Verification uses Bun's own S3 client as an independent
// oracle, never the code under test.
//
// Prereqs (see tests/e2e/README.md):
//   MinIO on http://localhost:9900 (minioadmin/minioadmin)
//   cargo test ipc_bridge -- --ignored --nocapture   (bridge on :17321)
//   bun test --preload ./tests/e2e/setup.ts tests/e2e
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { S3Client } from 'bun';
import { bridgeInvoke as invoke, receivedEvents, flushEvents } from './setup';
import { s3Service, parentPrefix } from '../../services/s3Service';
import { activityService } from '../../services/activityService';
import { secureStorage } from '../../services/secureStorage';
import JSZip from 'jszip';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import type { S3Account, S3Object, TransferJob } from '../../types';

const ENDPOINT = process.env.BUCKETSTACK_TEST_ENDPOINT || 'http://localhost:9900';
const KEY = process.env.BUCKETSTACK_TEST_KEY || 'minioadmin';
const SECRET = process.env.BUCKETSTACK_TEST_SECRET || 'minioadmin';
const REGION = 'us-east-1';
const RUN = Date.now().toString(36);
const BUCKET = `bs-e2e-${RUN}`;
const BUCKET2 = `bs-e2e-${RUN}-dst`;

const oracle = (bucket = BUCKET) =>
  new S3Client({ accessKeyId: KEY, secretAccessKey: SECRET, endpoint: ENDPOINT, region: REGION, bucket });

async function listKeys(prefix = '', bucket = BUCKET): Promise<string[]> {
  const c = oracle(bucket);
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res: any = await c.list({ prefix, maxKeys: 1000, ...(token ? { continuationToken: token } : {}) });
    for (const o of res.contents || []) keys.push(o.key);
    token = res.isTruncated ? res.nextContinuationToken : undefined;
  } while (token);
  return keys.sort();
}
const readText = (key: string, bucket = BUCKET) => oracle(bucket).file(key).text();
const exists = (key: string, bucket = BUCKET) => oracle(bucket).file(key).exists();
const put = (key: string, data: string | Uint8Array, bucket = BUCKET) => oracle(bucket).write(key, data);
async function contentType(key: string, bucket = BUCKET) {
  const url = oracle(bucket).presign(key, { method: 'HEAD' });
  return (await fetch(url, { method: 'HEAD' })).headers.get('content-type');
}
async function emptyBucket(bucket: string) {
  const keys = await listKeys('', bucket);
  await Promise.all(keys.map(k => oracle(bucket).delete(k)));
}

const account: S3Account = {
  id: `acc-${RUN}`,
  name: 'MinIO e2e',
  provider: 'minio',
  endpoint: ENDPOINT,
  region: REGION,
  bucketName: BUCKET,
  accessKeyId: KEY,
  secretAccessKey: SECRET,
  accessMode: 'read-write',
  enableTrash: false,
  enableActivityLog: true,
};
const trashAccount: S3Account = { ...account, id: `acc-${RUN}-trash`, enableTrash: true };
// Same server reached via a different endpoint string => the app treats it as a
// different provider and takes the cross-provider streaming path.
const otherProviderAccount: S3Account = {
  ...account, id: `acc-${RUN}-other`, endpoint: ENDPOINT.replace('localhost', '127.0.0.1'), bucketName: BUCKET2,
};
const dstAccount: S3Account = { ...account, id: `acc-${RUN}-dst`, bucketName: BUCKET2 };

const obj = (key: string, size = 0): S3Object => {
  const isFolder = key.endsWith('/');
  const name = isFolder ? key.split('/').filter(Boolean).pop()! : key.split('/').pop()!;
  return { key, name, size, isFolder, type: isFolder ? 'folder' : 'text', lastModified: Date.now() };
};
const fileOf = (name: string, content: string | Uint8Array, type = '') => new File([content], name, { type });
const randomBytes = (n: number) => {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i += 65536) crypto.getRandomValues(b.subarray(i, Math.min(i + 65536, n)));
  return b;
};
const sha = (b: Uint8Array | ArrayBuffer) => new Bun.CryptoHasher('sha256').update(b).digest('hex');
/** Error text as the UI would display it (services wrap the rejected value). */
const errText = (e: any) => (typeof e === 'string' ? e : e?.message ?? String(e));
async function rejects(p: Promise<any>): Promise<string> {
  try { await p; } catch (e) { return errText(e); }
  throw new Error('expected promise to reject');
}

const tmp = mkdtempSync(join(tmpdir(), 'bucketstack-e2e-'));

beforeAll(async () => {
  for (const b of [BUCKET, BUCKET2]) {
    await invoke('create_bucket', { endpoint: ENDPOINT, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET, bucket: b });
  }
});

afterAll(async () => {
  for (const b of [BUCKET, BUCKET2]) {
    await emptyBucket(b).catch(() => {});
    await invoke('delete_bucket', { endpoint: ENDPOINT, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET, bucket: b }).catch(() => {});
  }
  rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
describe('accounts & secure storage', () => {
  test('save / get / metadata never stores secrets in localStorage', async () => {
    await s3Service.saveAccount(account);
    const accounts = await s3Service.getAccounts();
    const got = accounts.find(a => a.id === account.id)!;
    expect(got.accessKeyId).toBe(KEY);
    expect(got.secretAccessKey).toBe(SECRET);
    const raw = localStorage.getItem('s3_desktop_accounts')!;
    expect(raw).not.toContain(SECRET);
    expect(await secureStorage.getItem(`bucketstack-${account.id}-secret`)).toBe(SECRET);
  });

  test('delete account removes credentials', async () => {
    const tmpAcc = { ...account, id: `acc-${RUN}-tmp` };
    await s3Service.saveAccount(tmpAcc);
    await s3Service.deleteAccount(tmpAcc.id);
    expect((await s3Service.getAccountMetadata()).some(a => a.id === tmpAcc.id)).toBe(false);
    expect(await secureStorage.getItem(`bucketstack-${tmpAcc.id}-secret`)).toBeNull();
  });

  test('legacy V1 plaintext accounts migrate into secure storage', async () => {
    const before = localStorage.getItem('s3_desktop_accounts');
    localStorage.removeItem('credentials_migrated_v3_secure_storage');
    const legacy = { ...account, id: `acc-${RUN}-legacy` };
    localStorage.setItem('s3_desktop_accounts', JSON.stringify([legacy]));
    await s3Service.initialize();
    expect(localStorage.getItem('s3_desktop_accounts')).not.toContain(SECRET);
    expect(await secureStorage.getItem(`bucketstack-${legacy.id}-secret`)).toBe(SECRET);
    await s3Service.deleteAccount(legacy.id);
    localStorage.setItem('s3_desktop_accounts', before!);
  });

  test('delete all accounts', async () => {
    const before = localStorage.getItem('s3_desktop_accounts');
    await s3Service.deleteAllAccounts();
    expect(await s3Service.getAccountMetadata()).toEqual([]);
    expect(await secureStorage.getItem(`bucketstack-${account.id}-secret`)).toBeNull();
    // restore for the rest of the suite
    localStorage.setItem('s3_desktop_accounts', before!);
    for (const a of [account, trashAccount, otherProviderAccount, dstAccount]) await s3Service.saveAccount(a);
  });
});

// ---------------------------------------------------------------------------
describe('connection test', () => {
  test('valid credentials => read-write, probe file cleaned up', async () => {
    const r = await s3Service.testConnection(account);
    expect(r.success).toBe(true);
    expect(r.accessMode).toBe('read-write');
    expect(await exists('.bucketstack/.probe')).toBe(false);
  });

  test('wrong secret => specific, human readable error', async () => {
    const msg = await rejects(s3Service.testConnection({ ...account, secretAccessKey: 'wrong-secret' }));
    expect(msg).toContain('Invalid Secret Access Key');
  });

  test('missing bucket => "does not exist"', async () => {
    const msg = await rejects(s3Service.testConnection({ ...account, bucketName: `nope-${RUN}` }));
    expect(msg).toContain('does not exist');
  });

  test('list_buckets (multi-bucket modal payload)', async () => {
    const list: string[] = await invoke('list_buckets', { endpoint: ENDPOINT, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET });
    expect(list).toContain(BUCKET);
    expect(list).toContain(BUCKET2);
  });
});

// ---------------------------------------------------------------------------
describe('buckets', () => {
  const b = `bs-e2e-${RUN}-tmp`;
  test('create bucket', async () => {
    await s3Service.createBucket(account, b);
    const list: string[] = await invoke('list_buckets', { endpoint: ENDPOINT, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET });
    expect(list).toContain(b);
  });
  test('create duplicate bucket => friendly message', async () => {
    const msg = await rejects(s3Service.createBucket(account, b));
    expect(msg).toMatch(/already (exists|owned by you)/i);
  });
  test('delete non-empty bucket => "Bucket is not empty"', async () => {
    await put('x.txt', 'x', b);
    const msg = await rejects(s3Service.deleteBucket(account, b));
    expect(msg).toBe('Bucket is not empty');
  });
  test('delete bucket', async () => {
    await oracle(b).delete('x.txt');
    await s3Service.deleteBucket(account, b);
    const list: string[] = await invoke('list_buckets', { endpoint: ENDPOINT, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET });
    expect(list).not.toContain(b);
  });
});

// ---------------------------------------------------------------------------
describe('upload / list / read', () => {
  test('small upload sets content + content type', async () => {
    await s3Service.uploadFile(account, BUCKET, '', fileOf('hello.txt', 'hello world'), () => {});
    expect(await readText('hello.txt')).toBe('hello world');
    expect(await contentType('hello.txt')).toContain('text/plain');
  });

  test('multipart upload (12MB) is byte-identical', async () => {
    const data = randomBytes(12 * 1024 * 1024 + 123);
    const progress: number[] = [];
    await s3Service.uploadFile(account, BUCKET, 'big/', fileOf('big.bin', data), p => progress.push(p));
    const back = new Uint8Array(await oracle().file('big/big.bin').arrayBuffer());
    expect(back.length).toBe(data.length);
    expect(sha(back)).toBe(sha(data));
    expect(progress.at(-1)).toBe(100);
  }, 120_000);

  test('folder upload (relative path names) creates nested keys', async () => {
    await s3Service.uploadFile(account, BUCKET, '', fileOf('a.txt', 'A'), () => {}, 'proj/src/a.txt');
    await s3Service.uploadFile(account, BUCKET, '', fileOf('b.json', '{"b":1}'), () => {}, 'proj/b.json');
    expect(await listKeys('proj/')).toEqual(['proj/b.json', 'proj/src/a.txt']);
    expect(await contentType('proj/b.json')).toContain('application/json');
  });

  test('listObjects shows folders and files with correct names', async () => {
    const root = await s3Service.listObjects(account, BUCKET, '');
    expect(root.find(o => o.key === 'proj/')?.isFolder).toBe(true);
    expect(root.find(o => o.key === 'proj/')?.name).toBe('proj');
    expect(root.find(o => o.key === 'hello.txt')?.size).toBe(11);
    const proj = await s3Service.listObjects(account, BUCKET, 'proj/');
    expect(proj.map(o => o.key)).toEqual(['proj/src/', 'proj/b.json']);
  });

  test('listObjects returns ALL entries for a prefix with >1000 objects', async () => {
    const keys = Array.from({ length: 1005 }, (_, i) => `many/f${String(i).padStart(4, '0')}.txt`);
    for (let i = 0; i < keys.length; i += 100) await Promise.all(keys.slice(i, i + 100).map(k => put(k, 'x')));
    const listed = await s3Service.listObjects(account, BUCKET, 'many/');
    expect(listed.length).toBe(1005);
  }, 120_000);

  test('getFileContent reads text', async () => {
    expect(await s3Service.getFileContent(account, BUCKET, 'proj/b.json')).toBe('{"b":1}');
  });

  test('getFileContent on binary gives a readable error', async () => {
    await put('bin.dat', new Uint8Array([0xff, 0xfe, 0x00, 0x81]));
    const msg = await rejects(s3Service.getFileContent(account, BUCKET, 'bin.dat'));
    expect(msg).toContain('UTF-8');
  });

  test('search is case-insensitive on file name', async () => {
    const r = await s3Service.searchObjects(account, BUCKET, 'HELLO');
    expect(r.map(o => o.key)).toContain('hello.txt');
  });

  test('calculateFolderSizes sums nested content', async () => {
    const sizes = await s3Service.calculateFolderSizes(account, BUCKET, 'proj/');
    expect(sizes['proj/src/']).toBe(1);
  });

  test('storage analytics scan counts every object', async () => {
    const a = await s3Service.scanBucket(account, BUCKET);
    const all = (await listKeys()).filter(k => !k.endsWith('/'));
    expect(a.totalObjects).toBe(all.length);
  }, 60_000);
});

// ---------------------------------------------------------------------------
describe('create folder / create & edit file', () => {
  test('create folder at root and nested', async () => {
    await s3Service.createFolder(account, BUCKET, '', 'docs');
    await s3Service.createFolder(account, BUCKET, 'docs/', 'inner');
    // (Bun's exists() can't HEAD "dir/" keys on MinIO, so check by listing)
    expect(await listKeys('docs/')).toEqual(['docs/', 'docs/inner/']);
    const docs = await s3Service.listObjects(account, BUCKET, 'docs/');
    expect(docs.map(o => o.key)).toEqual(['docs/inner/']);
  });

  test('create file + edit (overwrite) via editor flow', async () => {
    await s3Service.uploadFile(account, BUCKET, 'docs/', fileOf('note.md', '# v1', 'text/plain'), () => {});
    await s3Service.uploadFile(account, BUCKET, 'docs/', fileOf('note.md', '# v2', 'text/plain'), () => {});
    expect(await readText('docs/note.md')).toBe('# v2');
  });
});

// ---------------------------------------------------------------------------
describe('rename', () => {
  test('rename file', async () => {
    await put('r/old.txt', 'R');
    await s3Service.renameObject(account, BUCKET, obj('r/old.txt'), 'new.txt', 'r/');
    expect(await listKeys('r/')).toEqual(['r/new.txt']);
  });

  test('rename file whose name has spaces / + / % / unicode', async () => {
    const key = 'r/my file+v1 (1)%20ü.txt';
    await put(key, 'S');
    await s3Service.renameObject(account, BUCKET, obj(key), 'renamed ü+.txt', 'r/');
    expect(await listKeys('r/')).toEqual(['r/new.txt', 'r/renamed ü+.txt']);
  });

  test('rename file whose name contains "?" and "#" (created by the app itself)', async () => {
    await s3Service.uploadFile(account, BUCKET, 'r/', fileOf('q?x#y.txt', 'Q'), () => {});
    expect(await listKeys('r/q')).toEqual(['r/q?x#y.txt']);
    await s3Service.renameObject(account, BUCKET, obj('r/q?x#y.txt'), 'q2?.txt', 'r/');
    expect(await listKeys('r/q')).toEqual(['r/q2?.txt']);
    expect(await s3Service.getFileContent(account, BUCKET, 'r/q2?.txt')).toBe('Q');
  });

  test('rename from search results keeps the file in its own folder', async () => {
    await put('deep/er/found.txt', 'F');
    const [hit] = await s3Service.searchObjects(account, BUCKET, 'found.txt');
    // App.handleRename derives the parent from the key (search results can be anywhere)
    await s3Service.renameObject(account, BUCKET, hit, 'renamed.txt', parentPrefix(hit.key));
    expect(await listKeys('deep/')).toEqual(['deep/er/renamed.txt']);
    expect(parentPrefix('a/b/')).toBe('a/');
    expect(parentPrefix('top.txt')).toBe('');
  });

  test('rename folder moves ALL nested content', async () => {
    await s3Service.createFolder(account, BUCKET, '', 'fold');
    await put('fold/a.txt', 'a');
    await put('fold/sub/b.txt', 'b');
    await put('fold/sub/deeper/c.txt', 'c');
    await s3Service.renameObject(account, BUCKET, obj('fold/'), 'fold2', '');
    expect(await listKeys('fold/')).toEqual([]);
    expect(await listKeys('fold2/')).toEqual(['fold2/', 'fold2/a.txt', 'fold2/sub/b.txt', 'fold2/sub/deeper/c.txt']);
  });

  test('rename implicit folder (no marker object)', async () => {
    await put('implicit/x.txt', 'x');
    await s3Service.renameObject(account, BUCKET, obj('implicit/'), 'implicit2', '');
    expect(await listKeys('implicit/')).toEqual([]);
    expect(await listKeys('implicit2/')).toEqual(['implicit2/x.txt']);
  });
});

// ---------------------------------------------------------------------------
describe('copy / duplicate / paste / move', () => {
  test('duplicate file auto-renames "copy 1", "copy 2"', async () => {
    await put('c/doc.txt', 'D');
    await s3Service.copyObject(account, BUCKET, obj('c/doc.txt'), BUCKET, 'c/');
    await s3Service.copyObject(account, BUCKET, obj('c/doc.txt'), BUCKET, 'c/');
    expect(await listKeys('c/')).toEqual(['c/doc copy 1.txt', 'c/doc copy 2.txt', 'c/doc.txt']);
  });

  test('copy file with special characters', async () => {
    await put('c/spé cial+%.txt', 'S');
    await s3Service.copyObject(account, BUCKET, obj('c/spé cial+%.txt'), BUCKET, 'c2/');
    expect(await readText('c2/spé cial+%.txt')).toBe('S');
  });

  test('copy folder (nested) into another folder', async () => {
    await put('cf/a.txt', 'a');
    await put('cf/sub/b.txt', 'b');
    await s3Service.copyObject(account, BUCKET, obj('cf/'), BUCKET, 'target/');
    expect(await listKeys('target/')).toEqual(['target/cf/a.txt', 'target/cf/sub/b.txt']);
    expect(await listKeys('cf/')).toEqual(['cf/a.txt', 'cf/sub/b.txt']);
  });

  test('paste into another bucket', async () => {
    await s3Service.copyObject(account, BUCKET, obj('c/doc.txt'), BUCKET2, '');
    expect(await readText('doc.txt', BUCKET2)).toBe('D');
  });

  test('move (App handleMoveToDestination: copy then delete) file and folder', async () => {
    await put('mv/file.txt', 'F');
    await put('mv/dir/x.txt', 'X');
    await s3Service.createFolder(account, BUCKET, '', 'dest');
    for (const o of [obj('mv/file.txt'), obj('mv/dir/')]) {
      await s3Service.copyObject(account, BUCKET, o, BUCKET, 'dest/');
      await s3Service.deleteObject(account, BUCKET, o, 'mv/');
    }
    expect(await listKeys('mv/')).toEqual([]);
    expect(await listKeys('dest/')).toEqual(['dest/', 'dest/dir/x.txt', 'dest/file.txt']);
  });
});

// ---------------------------------------------------------------------------
describe('delete / trash / restore', () => {
  test('delete file', async () => {
    await put('d/one.txt', '1');
    await s3Service.deleteObject(account, BUCKET, obj('d/one.txt'), 'd/');
    expect(await exists('d/one.txt')).toBe(false);
  });

  test('delete folder removes everything nested', async () => {
    await s3Service.createFolder(account, BUCKET, '', 'df');
    await put('df/a.txt', 'a');
    await put('df/s/b.txt', 'b');
    await put('df/s/t/c.txt', 'c');
    await s3Service.deleteObject(account, BUCKET, obj('df/'), '');
    expect(await listKeys('df/')).toEqual([]);
  });

  test('delete folder with >1000 objects removes everything', async () => {
    await s3Service.deleteObject(account, BUCKET, obj('many/'), '');
    expect(await listKeys('many/')).toEqual([]);
  }, 180_000);

  test('trash: delete moves file to .trash/ with original-path metadata, restore brings it back', async () => {
    await s3Service.uploadFile(account, BUCKET, 't/', fileOf('keep me.txt', 'K'), () => {});
    await s3Service.deleteObject(trashAccount, BUCKET, obj('t/keep me.txt'), 't/');
    expect(await exists('t/keep me.txt')).toBe(false);
    expect(await readText('.trash/t/keep me.txt')).toBe('K');
    const meta = await s3Service.getObjectMetadata(trashAccount, BUCKET, '.trash/t/keep me.txt');
    expect(meta['original-path']).toBe('t/keep me.txt');
    await s3Service.restoreObject(trashAccount, BUCKET, obj('.trash/t/keep me.txt'));
    expect(await readText('t/keep me.txt')).toBe('K');
    // content type must survive the trash round-trip
    expect(await contentType('t/keep me.txt')).toContain('text/plain');
    expect(await exists('.trash/t/keep me.txt')).toBe(false);
  });

  test('trash: deleting a folder puts its nested files in .trash/', async () => {
    await put('tf/a.txt', 'a');
    await put('tf/s/b.txt', 'b');
    await s3Service.deleteObject(trashAccount, BUCKET, obj('tf/'), '');
    expect(await listKeys('tf/')).toEqual([]);
    expect(await listKeys('.trash/tf/')).toEqual(['.trash/tf/a.txt', '.trash/tf/s/b.txt']);
  });

  test('trash: restoring a trashed folder restores all nested files', async () => {
    await s3Service.restoreObject(trashAccount, BUCKET, obj('.trash/tf/'));
    expect(await listKeys('tf/')).toEqual(['tf/a.txt', 'tf/s/b.txt']);
    expect(await listKeys('.trash/tf/')).toEqual([]);
  });

  test('empty trash (App handleEmptyTrash)', async () => {
    await s3Service.createFolder(trashAccount, BUCKET, '', '.trash');
    await s3Service.deleteObject(trashAccount, BUCKET, obj('.trash/'), '');
    expect(await listKeys('.trash/')).toEqual([]);
  });

  test('disable trash cleanup (delete_trash_folder) is permitted and works', async () => {
    await put('.trash/z.txt', 'z');
    await s3Service.deleteTrashFolder(trashAccount);
    expect(await listKeys('.trash/')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('links / download', () => {
  test('presigned link downloads the content (main + tray payloads)', async () => {
    const url = await s3Service.getPresignedUrl(account, BUCKET, obj('hello.txt'), 120);
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello world');
    expect(res.headers.get('content-disposition')).toContain('hello.txt');
    const trayUrl: string = await invoke('get_signed_url', {
      endpoint: account.endpoint || '', region: REGION, accessKeyId: KEY, secretAccessKey: SECRET,
      bucket: BUCKET, key: 'hello.txt', expiresIn: 3600,
    });
    expect(await (await fetch(trayUrl)).text()).toBe('hello world');
  });

  test('presigned link for key with spaces/unicode', async () => {
    const url = await s3Service.getPresignedUrl(account, BUCKET, obj('t/keep me.txt'), 120);
    expect(await (await fetch(url)).text()).toBe('K');
  });

  test('download single file (App handleDownload payload)', async () => {
    const path = join(tmp, 'dl-hello.txt');
    await invoke('download_file_to_path', {
      endpoint: account.endpoint, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET,
      bucket: BUCKET, key: 'hello.txt', path,
    });
    expect(readFileSync(path, 'utf8')).toBe('hello world');
  });

  test('download multipart file is byte-identical', async () => {
    const path = join(tmp, 'dl-big.bin');
    await invoke('download_file_to_path', {
      endpoint: account.endpoint, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET,
      bucket: BUCKET, key: 'big/big.bin', path,
    });
    const remote = new Uint8Array(await oracle().file('big/big.bin').arrayBuffer());
    expect(sha(readFileSync(path))).toBe(sha(remote));
  }, 60_000);
});

// ---------------------------------------------------------------------------
// Exact payload of App.tsx performCompress()
const compress = (keys: string[], prefix: string, format: 'zip' | 'tar.gz') =>
  invoke('compress_objects', {
    endpoint: account.endpoint, bucket: account.bucketName, keys, prefix, format,
    accessKeyId: account.accessKeyId, secretAccessKey: account.secretAccessKey, region: account.region,
  });

describe('compress (zip / tar.gz)', () => {
  beforeAll(async () => {
    await put('z/one.txt', 'ONE');
    await put('z/two.md', 'TWO');
    await put('z/folder/inner.txt', 'INNER');
    await put('z/folder/deep/x.txt', 'X');
    await put('z2/one.txt', 'OTHER ONE'); // same basename, different folder
  });

  test('zip of two files', async () => {
    await compress(['z/one.txt', 'z/two.md'], 'z/', 'zip');
    const zip = await JSZip.loadAsync(await oracle().file('z/archive.zip').arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(['one.txt', 'two.md']);
    expect(await zip.file('one.txt')!.async('string')).toBe('ONE');
  });

  test('tar.gz of two files', async () => {
    await compress(['z/one.txt', 'z/two.md'], 'z/', 'tar.gz');
    const local = join(tmp, 'a.tar.gz');
    writeFileSync(local, new Uint8Array(await oracle().file('z/archive.tar.gz').arrayBuffer()));
    const list = execSync(`tar -tzf "${local}"`).toString().trim().split('\n').sort();
    expect(list).toEqual(['one.txt', 'two.md']);
  });

  test('zip of a folder includes nested files with paths', async () => {
    await compress(['z/folder/'], 'z/', 'zip');
    const zip = await JSZip.loadAsync(await oracle().file('z/archive.zip').arrayBuffer());
    const files = Object.keys(zip.files).filter(f => !f.endsWith('/')).sort();
    expect(files).toEqual(['folder/deep/x.txt', 'folder/inner.txt']);
    expect(await zip.file('folder/inner.txt')!.async('string')).toBe('INNER');
  });

  test('tar.gz of a folder includes nested files', async () => {
    await compress(['z/folder/'], 'z/', 'tar.gz');
    const local = join(tmp, 'f.tar.gz');
    writeFileSync(local, new Uint8Array(await oracle().file('z/archive.tar.gz').arrayBuffer()));
    const list = execSync(`tar -tzf "${local}"`).toString().trim().split('\n').filter(f => !f.endsWith('/')).sort();
    expect(list).toEqual(['folder/deep/x.txt', 'folder/inner.txt']);
  });

  test('zip at bucket root (prefix "")', async () => {
    await compress(['hello.txt'], '', 'zip');
    const zip = await JSZip.loadAsync(await oracle().file('archive.zip').arrayBuffer());
    expect(await zip.file('hello.txt')!.async('string')).toBe('hello world');
  });

  // ('../' traversal in keys is covered by the Rust unit test archive_entry_path_* — MinIO rejects such keys)

  test('compressing an empty folder reports a clear error', async () => {
    await s3Service.createFolder(account, BUCKET, 'z/', 'emptydir');
    const msg = await rejects(compress(['z/emptydir/'], 'z/', 'zip'));
    expect(msg).toContain('empty');
  });

  test('archive has a sensible content type', async () => {
    expect(await contentType('z/archive.zip')).toContain('application/zip');
  });

  test('download-as-archive flow (compress then download_file_to_path)', async () => {
    await compress(['z/one.txt', 'z/two.md'], 'z/', 'zip');
    const path = join(tmp, 'dl.zip');
    await invoke('download_file_to_path', {
      endpoint: account.endpoint, region: REGION, accessKeyId: KEY, secretAccessKey: SECRET,
      bucket: BUCKET, key: 'z/archive.zip', path,
    });
    const zip = await JSZip.loadAsync(readFileSync(path));
    expect(Object.keys(zip.files).sort()).toEqual(['one.txt', 'two.md']);
  });
});

// ---------------------------------------------------------------------------
describe('native drag & drop upload (upload_paths)', () => {
  test('uploads files and whole directories under the current prefix', async () => {
    const dir = join(tmp, 'dropdir');
    mkdirSync(join(dir, 'nested'), { recursive: true });
    writeFileSync(join(dir, 'top.txt'), 'top');
    writeFileSync(join(dir, 'nested', 'n.txt'), 'n');
    const single = join(tmp, 'single.csv');
    writeFileSync(single, 'a,b');
    receivedEvents.length = 0;
    await invoke('upload_paths', {
      accountId: account.id, provider: account.provider, endpoint: account.endpoint, region: REGION,
      accessKeyId: KEY, secretAccessKey: SECRET, bucket: BUCKET, prefix: 'drop/', paths: [dir, single],
      enableActivityLog: true,
    });
    expect(await listKeys('drop/')).toEqual(['drop/dropdir/nested/n.txt', 'drop/dropdir/top.txt', 'drop/single.csv']);
    await flushEvents();
    const done = receivedEvents.filter(e => e.event === 'upload-progress' && e.payload.status === 'completed');
    expect(done.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
describe('sync', () => {
  const local = join(tmp, 'sync-up');
  test('sync up uploads new files, then is a no-op', async () => {
    mkdirSync(join(local, 'a'), { recursive: true });
    writeFileSync(join(local, 'root.txt'), 'r');
    writeFileSync(join(local, 'a', 'b.txt'), 'b');
    const s1 = await s3Service.syncFolder(account, BUCKET, local, 'synced', 'up');
    expect(s1.errors).toEqual([]);
    expect(s1.files_transferred).toBe(2);
    expect(await listKeys('synced/')).toEqual(['synced/a/b.txt', 'synced/root.txt']);
    const s2 = await s3Service.syncFolder(account, BUCKET, local, 'synced/', 'up');
    expect(s2.files_transferred).toBe(0);
  });

  test('sync up re-uploads changed files and mirror deletes remote extras', async () => {
    writeFileSync(join(local, 'root.txt'), 'changed!');
    await put('synced/extra.txt', 'e');
    const s = await s3Service.syncFolder(account, BUCKET, local, 'synced', 'up', true);
    expect(s.errors).toEqual([]);
    expect(await readText('synced/root.txt')).toBe('changed!');
    expect(await exists('synced/extra.txt')).toBe(false);
  });

  test('sync down downloads, mirror deletes local extras', async () => {
    const down = join(tmp, 'sync-down');
    mkdirSync(down, { recursive: true });
    writeFileSync(join(down, 'stale.txt'), 'old');
    const s = await s3Service.syncFolder(account, BUCKET, down, 'synced', 'down', true);
    expect(s.errors).toEqual([]);
    expect(readFileSync(join(down, 'a', 'b.txt'), 'utf8')).toBe('b');
    expect(readFileSync(join(down, 'root.txt'), 'utf8')).toBe('changed!');
    expect(existsSync(join(down, 'stale.txt'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
const job = (over: Partial<TransferJob>): TransferJob => ({
  id: Math.random().toString(36).slice(2, 11), type: 'copy',
  sourceAccount: account, sourceBucket: BUCKET, sourceKey: '', destAccount: dstAccount, destBucket: BUCKET2,
  destKey: '', fileName: '', isFolder: false, status: 'pending', progress: 0, bytesTransferred: 0,
  totalBytes: 0, speed: 0, ...over,
} as TransferJob);

describe('transfers (TransferModal / sidebar drop)', () => {
  test('same bucket copy into folder', async () => {
    await s3Service.transferObjects([job({ sourceKey: 'hello.txt', destAccount: account, destBucket: BUCKET, destKey: 'xfer/hello.txt', fileName: 'hello.txt' })], () => {});
    expect(await readText('xfer/hello.txt')).toBe('hello world');
  });

  test('same bucket move file', async () => {
    await put('xm/m.txt', 'M');
    await s3Service.transferObjects([job({ type: 'move', sourceKey: 'xm/m.txt', destAccount: account, destBucket: BUCKET, destKey: 'xm2/m.txt', fileName: 'm.txt' })], () => {});
    expect(await exists('xm/m.txt')).toBe(false);
    expect(await readText('xm2/m.txt')).toBe('M');
  });

  test('same bucket copy + move of a nested folder into another folder', async () => {
    await put('sf/a.txt', 'a');
    await put('sf/s/b.txt', 'b');
    await s3Service.transferObjects([job({ sourceKey: 'sf/', destAccount: account, destBucket: BUCKET, destKey: 'sfdst/sf/', fileName: 'sf', isFolder: true })], () => {});
    expect(await listKeys('sfdst/')).toEqual(['sfdst/sf/a.txt', 'sfdst/sf/s/b.txt']);
    await s3Service.transferObjects([job({ type: 'move', sourceKey: 'sf/', destAccount: account, destBucket: BUCKET, destKey: 'sfmv/sf/', fileName: 'sf', isFolder: true })], () => {});
    expect(await listKeys('sf/')).toEqual([]);
    expect(await listKeys('sfmv/')).toEqual(['sfmv/sf/a.txt', 'sfmv/sf/s/b.txt']);
  });

  test('cross bucket (same provider) file + nested folder, progress completes', async () => {
    const updates: any[] = [];
    await put('xf/a.txt', 'a');
    await put('xf/s/b.txt', 'b');
    const j1 = job({ sourceKey: 'hello.txt', destKey: 'hello.txt', fileName: 'hello.txt' });
    const j2 = job({ sourceKey: 'xf/', destKey: 'xf/', fileName: 'xf', isFolder: true });
    await s3Service.transferObjects([j1, j2], u => updates.push(u));
    await flushEvents();
    expect(await readText('hello.txt', BUCKET2)).toBe('hello world');
    expect(await listKeys('xf/', BUCKET2)).toEqual(['xf/a.txt', 'xf/s/b.txt']);
    for (const j of [j1, j2]) expect(updates.some(u => u.jobId === j.id && u.status === 'completed')).toBe(true);
  });

  test('cross provider stream: small file, large (multipart) file, nested folder', async () => {
    const updates: any[] = [];
    await put('cp/s/deep.txt', 'deep');
    await put('cp/top.txt', 'top');
    const small = job({ sourceKey: 'hello.txt', destAccount: otherProviderAccount, destKey: 'cp-hello.txt', fileName: 'hello.txt' });
    const big = job({ sourceKey: 'big/big.bin', destAccount: otherProviderAccount, destKey: 'cp-big.bin', fileName: 'big.bin' });
    const folder = job({ sourceKey: 'cp/', destAccount: otherProviderAccount, destKey: 'cpdst/', fileName: 'cp', isFolder: true });
    await s3Service.transferObjects([small, big, folder], u => updates.push(u));
    await flushEvents();
    expect(await readText('cp-hello.txt', BUCKET2)).toBe('hello world');
    const a = new Uint8Array(await oracle().file('big/big.bin').arrayBuffer());
    const b = new Uint8Array(await oracle(BUCKET2).file('cp-big.bin').arrayBuffer());
    expect(sha(b)).toBe(sha(a));
    expect(await listKeys('cpdst/', BUCKET2)).toEqual(['cpdst/s/deep.txt', 'cpdst/top.txt']);
    for (const j of [small, big, folder]) expect(updates.some(u => u.jobId === j.id && u.status === 'completed')).toBe(true);
  }, 120_000);

  test('transfer is recorded in the activity log', async () => {
    await new Promise(r => setTimeout(r, 300));
    const log = await activityService.queryLog({ connection_id: account.id, action_type: 'copy' }, 100, 0);
    expect(log.some(e => e.object_path_before === 'hello.txt')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('activity log', () => {
  test('log / query / filter / export / clear', async () => {
    await activityService.logActivity(account, 'upload', 'act/a,b "q".txt', undefined, 'success', undefined, 5);
    await activityService.logActivity(account, 'delete', 'act/x.txt', undefined, 'failed', 'boom');
    await new Promise(r => setTimeout(r, 300));
    const all = await activityService.queryLog({ connection_id: account.id, search: 'act/' }, 100, 0);
    expect(all.length).toBe(2);
    const failed = await activityService.queryLog({ connection_id: account.id, status: 'failed', search: 'act/' }, 100, 0);
    expect(failed.map(e => e.error_message)).toEqual(['boom']);
    const json = JSON.parse(await activityService.exportLog('json', { connection_id: account.id }));
    expect(json.length).toBeGreaterThanOrEqual(2);
    const csv = await activityService.exportLog('csv', { connection_id: account.id, search: 'act/a' });
    const lines = csv.trim().split('\n');
    expect(lines.length).toBe(2);
    // A comma/quote in a path must not shift columns: still 10 CSV fields.
    const fields = lines[1].match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.filter(f => f !== '');
    expect(fields.length).toBe(10);
    await activityService.clearLog(account.id);
    expect(await activityService.queryLog({ connection_id: account.id }, 100, 0)).toEqual([]);
  });

  test('logging disabled => nothing recorded', async () => {
    await activityService.logActivity({ ...account, enableActivityLog: false }, 'upload', 'nolog.txt');
    await new Promise(r => setTimeout(r, 300));
    expect(await activityService.queryLog({ search: 'nolog.txt' }, 10, 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('window / tray commands', () => {
  test('show/hide main window, hide tray, quick-upload event', async () => {
    receivedEvents.length = 0;
    await invoke('show_main_window');
    await invoke('hide_main_window');
    await invoke('hide_tray');
    await invoke('quick_upload');
    await flushEvents();
    expect(receivedEvents.some(e => e.event === 'quick-upload')).toBe(true);
  });
});
