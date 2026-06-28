import { Router } from "express";
import { CATEGORIES, COMMUNITY_TOPICS, NEIGHBORHOODS, GLOSSARY } from "@umuturanyi/shared";
import { ok } from "../../lib/http.js";

/**
 * Static reference data the client needs to render forms and filters. Served from
 * the shared package so the taxonomy has a single source of truth.
 */
export const catalogRouter = Router();

catalogRouter.get("/categories", (_req, res) => ok(res, { categories: CATEGORIES }));
catalogRouter.get("/topics", (_req, res) => ok(res, { topics: COMMUNITY_TOPICS }));
catalogRouter.get("/neighborhoods", (_req, res) => ok(res, { neighborhoods: NEIGHBORHOODS }));
catalogRouter.get("/glossary", (_req, res) => ok(res, { glossary: GLOSSARY }));
