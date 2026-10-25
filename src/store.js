import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
export function openStore(
  dir = process.env.DATA_DIR || "/workspace/shared/venice-network",
) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(dir, "network.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS content(id INTEGER PRIMARY KEY, channel TEXT NOT NULL, kind TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, summary TEXT NOT NULL, body TEXT NOT NULL, venue TEXT DEFAULT '', event_date TEXT DEFAULT '', destination TEXT DEFAULT '', sponsor TEXT DEFAULT '', status TEXT DEFAULT 'draft', publish_at TEXT DEFAULT '', demo INTEGER DEFAULT 0, updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS leads(id INTEGER PRIMARY KEY, type TEXT, channel TEXT, email TEXT, name TEXT, payload TEXT, status TEXT DEFAULT 'new', created_at TEXT);
 CREATE TABLE IF NOT EXISTS subscribers(id INTEGER PRIMARY KEY, email TEXT UNIQUE, channel TEXT, token TEXT UNIQUE, status TEXT, created_at TEXT);
 CREATE TABLE IF NOT EXISTS metrics(id INTEGER PRIMARY KEY, event TEXT, channel TEXT, content_id INTEGER, campaign_id TEXT, created_at TEXT);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, action TEXT, entity_id INTEGER, created_at TEXT);
 CREATE TABLE IF NOT EXISTS contracts(id INTEGER PRIMARY KEY, name TEXT, monthly_cents INTEGER, recurring INTEGER, status TEXT, deliverables TEXT, renewal_date TEXT);
 `);
  if (!db.prepare("SELECT count(*) AS n FROM content").get().n) {
    const add = db.prepare(
      "INSERT INTO content(channel,kind,slug,title,category,summary,body,venue,demo,status,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)",
    );
    for (const row of [
      [
        "buzz",
        "story",
        "after-the-last-set",
        "After the last set",
        "Music",
        "A field guide to listening a little closer.",
        "This is a sample editorial layout, not a reported story. Replace this text with an original, rights-cleared feature before launch. Tell the story of the room, the musicians, and the people who keep a scene alive.",
        "",
      ],
      [
        "buzz",
        "story",
        "a-different-kind-of-screen",
        "A different kind of screen time",
        "Film",
        "Independent cinema. Shared rooms. Bigger conversations.",
        "Sample content for the film collection. Add verified screening information and original reporting through the shared publishing desk.",
        "",
      ],
      [
        "buzz",
        "story",
        "the-art-of-showing-up",
        "The art of showing up",
        "Culture",
        "Small spaces. New ideas. A scene made together.",
        "Sample culture feature. No event dates or attendance claims are implied.",
        "",
      ],
      [
        "press",
        "profile",
        "the-space-between-frames",
        "The space between frames",
        "Film",
        "Inside the process of an independent filmmaker.",
        "Sample creator profile. This fictional placeholder demonstrates the profile template; it does not represent a real person. Replace it with an approved biography, project details, and licensed assets.",
        "",
      ],
      [
        "press",
        "profile",
        "sound-with-a-sense-of-place",
        "Sound with a sense of place",
        "Music",
        "On making records that feel like somewhere.",
        "Sample musician profile. Publish an approved interview, credits, project links, and relevant release information here.",
        "",
      ],
      [
        "press",
        "project",
        "made-by-the-water",
        "Made by the water",
        "Art",
        "A studio practice shaped by the everyday.",
        "Sample project showcase. Replace with an original project description and permission-cleared materials.",
        "",
      ],
    ])
      add.run(...row, "published", new Date().toISOString());
  }
  for (const [name, type] of [
    ["byline", "TEXT DEFAULT ''"],
    ["source_url", "TEXT DEFAULT ''"],
    ["published_at", "TEXT DEFAULT ''"],
    ["verified_at", "TEXT DEFAULT ''"],
    ["creator_name", "TEXT DEFAULT ''"],
    ["creator_type", "TEXT DEFAULT 'Person'"],
    ["venue_address", "TEXT DEFAULT ''"],
    ["campaign_id", "TEXT DEFAULT ''"],
    ["tags", "TEXT DEFAULT ''"],
    ["related_id", "INTEGER"],
    ["image_path", "TEXT DEFAULT ''"],
    ["image_alt", "TEXT DEFAULT ''"],
    ["image_credit", "TEXT DEFAULT ''"],
    ["rights_note", "TEXT DEFAULT ''"],
  ]) {
    if (
      !db
        .prepare("PRAGMA table_info(content)")
        .all()
        .some((c) => c.name === name)
    )
      db.exec(`ALTER TABLE content ADD COLUMN ${name} ${type}`);
  }
  db.exec(
    "CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY, content_id INTEGER, snapshot TEXT, actor TEXT, created_at TEXT)",
  );
  for (const [name, type] of [
    ["notice_version", "TEXT DEFAULT ''"],
    ["consent_at", "TEXT DEFAULT ''"],
    ["withdrawn_at", "TEXT DEFAULT ''"],
  ]) {
    if (
      !db
        .prepare("PRAGMA table_info(subscribers)")
        .all()
        .some((c) => c.name === name)
    )
      db.exec(`ALTER TABLE subscribers ADD COLUMN ${name} ${type}`);
  }
  for (const [name, type] of [
    ["agreement_ref", "TEXT DEFAULT ''"],
    ["terms_confirmed_at", "TEXT DEFAULT ''"],
  ]) {
    if (
      !db
        .prepare("PRAGMA table_info(contracts)")
        .all()
        .some((c) => c.name === name)
    )
      db.exec(`ALTER TABLE contracts ADD COLUMN ${name} ${type}`);
  }
  db.exec("COMMIT");
  return db;
}
