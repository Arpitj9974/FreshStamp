/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const desiredPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Increase payload limit for base64 image uploads
  app.use(express.json({ limit: "15mb" }));

  // API endpoints
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image, localApiKey } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image base64 data" });
      }

      // Determine API key to use (prioritize local user key, fall back to server env)
      const apiKey = localApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({ 
          error: "No Gemini API key found. Please set your Gemini API key in Settings (stored locally) or configure the server's GEMINI_API_KEY.",
          isMissingKey: true 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Split base64 header if present
      const base64Data = image.includes(",") ? image.split(",")[1] : image;
      const mimeType = image.includes(";") ? image.split(";")[0].split(":")[1] : "image/jpeg";

      const prompt = `Analyze this food or product packaging image and extract the following details for inventory tracking:
1. Product Name (e.g., 'Amul Gold Milk', 'Paracetamol', 'Sunscreen SPF 50', 'Amul Butter', 'Greek Yogurt')
2. Brand (e.g., 'Amul', 'Crocen', 'Neutrogena', 'Mother Dairy')
3. Category (must be exactly one of: 'Grocery', 'Medicine', 'Cosmetics', 'Household', 'Other')
4. Expiry Date (Format: YYYY-MM-DD. Search carefully for 'EXP', 'Best Before', 'Expiry', 'Use By', date stamps, etc. If only a month and year is found e.g. '08/24', resolve to the last day of that month, e.g. '2024-08-31')
5. Estimated Quantity (Integer, default to 1 if not specified)
6. Estimated Price in Rupees (Number, default to 0 if not specified)
7. Any additional notes

Return the result STRICTLY as a JSON object matching this schema:
{
  "name": string,
  "brand": string,
  "category": "Grocery" | "Medicine" | "Cosmetics" | "Household" | "Other",
  "expiryDate": string (YYYY-MM-DD format or empty string if not found),
  "quantity": number,
  "price": number,
  "notes": string
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          prompt
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response text from Gemini");
      }

      const parsed = JSON.parse(resultText.trim());
      res.json(parsed);

    } catch (error: any) {
      console.error("Gemini OCR error:", error);
      res.status(500).json({ error: error.message || "Failed to process image with Gemini AI." });
    }
  });

  // Serving UI / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  function listen(port: number) {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${port}`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} is in use, trying http://localhost:${port + 1}...`);
        listen(port + 1);
      } else {
        console.error("Server error:", err);
      }
    });
  }

  listen(desiredPort);
}

startServer();
