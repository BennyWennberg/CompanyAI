import request from 'supertest';
import express from 'express';
import app from '../src/app';

describe('Health & Hello', () => {
  it('GET /api/health returns OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(Array.isArray(res.body.modules)).toBe(true);
  });

  it('GET / (root) returns API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('CompanyAI Backend API');
  });
});


