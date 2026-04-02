import type { Request, Response } from 'express';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? '';

export async function photoProxyHandler(req: Request, res: Response) {
    const ref = req.query.ref as string;
    const maxwidth = parseInt(req.query.maxwidth as string, 10) || 400;

    if (!ref) {
        res.status(400).json({ error: 'MISSING_PARAM', message: 'ref is required' });
        return;
    }

    try {
        const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${maxwidth}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            res.status(response.status).json({ error: 'PHOTO_FETCH_FAILED' });
            return;
        }

        const contentType = response.headers.get('content-type') ?? 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
    } catch {
        res.status(502).json({ error: 'PHOTO_PROXY_ERROR' });
    }
}
