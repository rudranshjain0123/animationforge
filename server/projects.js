import { Router } from 'express'
import { effectById } from '../src/effects.js'
import { validateProject } from './storage.js'

export function projectRoutes(storage) {
  const router = Router()
  const limit = (res) => res.status(409).json({ error: 'Project limit reached.' })
  const invalid = (res) => res.status(400).json({ error: 'Enter a project title and choose an effect.' })
  router.get('/projects', (_req, res) => res.json(storage.list(res.locals.subject)))
  router.post('/projects', (req, res) => {
    const input = validateProject(req.body)
    if (!input) return invalid(res)
    const result = storage.create(res.locals.subject, input)
    return result ? res.status(201).json(result) : limit(res)
  })
  router.put('/projects/:id', (req, res) => {
    const input = validateProject(req.body)
    if (!input) return invalid(res)
    const result = storage.update(res.locals.subject, req.params.id, input)
    return result ? res.json(result) : res.sendStatus(404)
  })
  router.post('/projects/:id/duplicate', (req, res) => {
    const result = storage.duplicate(res.locals.subject, req.params.id)
    if (result === null) return limit(res)
    return result ? res.status(201).json(result) : res.sendStatus(404)
  })
  router.delete('/projects/:id', (req, res) => {
    const deleted = storage.delete(res.locals.subject, req.params.id)
    return res.sendStatus(deleted ? 204 : 404)
  })
  router.get('/favorites', (_req, res) => res.json(storage.favorites(res.locals.subject)))
  router.put('/favorites/:id', (req, res) => {
    if (!effectById.has(req.params.id) || typeof req.body?.active !== 'boolean') return res.sendStatus(400)
    storage.favorite(res.locals.subject, req.params.id, req.body.active)
    return res.sendStatus(204)
  })
  router.use((_req, res) => res.sendStatus(404))
  return router
}
