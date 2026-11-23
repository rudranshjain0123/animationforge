import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { effectById, normalizeValues } from '../src/effects.js'

const digest = (value = '') => createHash('sha256').update(value).digest('hex')
const project = (row) => row && ({
  id: row.id, title: row.title, effectId: row.effect_id, values: JSON.parse(row.settings), updated: row.updated,
})

export function validateProject(input) {
  const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 90) : ''
  const effect = effectById.get(input?.effectId)
  if (!effect || !title || !input.values || typeof input.values !== 'object' || Array.isArray(input.values)) return null
  return { title, effectId: effect.id, values: normalizeValues(effect, input.values) }
}

export function openStorage(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS profiles (subject TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (
      digest TEXT PRIMARY KEY, subject TEXT NOT NULL REFERENCES profiles(subject), expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires);
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, subject TEXT NOT NULL REFERENCES profiles(subject),
      title TEXT NOT NULL, effect_id TEXT NOT NULL, settings TEXT NOT NULL, updated INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS projects_owner ON projects(subject, updated DESC);
    CREATE TABLE IF NOT EXISTS favorites (
      subject TEXT NOT NULL REFERENCES profiles(subject), effect_id TEXT NOT NULL,
      PRIMARY KEY (subject, effect_id)
    );
  `)
  const getProject = db.prepare('SELECT * FROM projects WHERE subject=? AND id=?')
  function createProject(subject, input) {
    const id = randomUUID()
    const inserted = insertProjectConditional.run(id, subject, input.title, input.effectId, JSON.stringify(input.values), Date.now(), subject)
    return inserted.changes ? project(getProject.get(subject, id)) : null
  }
  const insertProjectConditional = db.prepare(`
    INSERT INTO projects SELECT ?, ?, ?, ?, ?, ? WHERE
    (SELECT count(*) FROM projects WHERE subject=?) < 500
  `)
  return {
    close: () => db.close(),
    startSession(id, subject, name, expires) {
      db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now())
        db.prepare('INSERT INTO profiles VALUES (?, ?) ON CONFLICT(subject) DO UPDATE SET name=excluded.name').run(subject, name)
        db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(id), subject, expires)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    session: (id) => db.prepare(`
      SELECT subject, name, expires FROM sessions JOIN profiles USING(subject) WHERE digest=? AND expires>?
    `).get(digest(id), Date.now()),
    endSession: (id) => db.prepare('DELETE FROM sessions WHERE digest=?').run(digest(id)),
    list: (subject) => db.prepare('SELECT * FROM projects WHERE subject=? ORDER BY updated DESC, id').all(subject).map(project),
    create: createProject,
    update(subject, id, value) {
      const result = db.prepare('UPDATE projects SET title=?, effect_id=?, settings=?, updated=? WHERE subject=? AND id=?')
        .run(value.title, value.effectId, JSON.stringify(value.values), Date.now(), subject, id)
      return result.changes ? project(getProject.get(subject, id)) : undefined
    },
    duplicate(subject, id) {
      const source = project(getProject.get(subject, id))
      return source ? createProject(subject, { ...source, title: source.title.slice(0, 83) + ' (copy)' }) : undefined
    },
    delete: (subject, id) => db.prepare('DELETE FROM projects WHERE subject=? AND id=?').run(subject, id).changes,
    favorites: (subject) => db.prepare('SELECT effect_id FROM favorites WHERE subject=? ORDER BY effect_id').all(subject)
      .map(({ effect_id }) => effect_id),
    favorite(subject, effectId, active) {
      if (active) db.prepare('INSERT OR IGNORE INTO favorites VALUES (?, ?)').run(subject, effectId)
      else db.prepare('DELETE FROM favorites WHERE subject=? AND effect_id=?').run(subject, effectId)
    },
  }
}
