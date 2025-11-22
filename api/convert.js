import Busboy from 'busboy';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const filePath = await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });
      let tmpPath = null;

      busboy.on('file', (fieldname, file, filename) => {
        tmpPath = path.join(os.tmpdir(), filename);
        const writeStream = fs.createWriteStream(tmpPath);
        file.pipe(writeStream);

        writeStream.on('finish', () => resolve(tmpPath));
        writeStream.on('error', reject);
      });

      busboy.on('error', reject);
      req.pipe(busboy);
    });

    if (!filePath) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const apiKey = process.env.CONVERT_API_SECRET;
    if (!apiKey) {
      return res.status(500).json({ error: "ConvertAPI Key Missing" });
    }

    const formData = new FormData();
    formData.append('File', fs.createReadStream(filePath));
    formData.append('StoreFile', 'true');

    const convertUrl = `https://v2.convertapi.com/convert/pdf/to/docx?Secret=${apiKey}`;

    const response = await axios.post(convertUrl, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const fileURL = response.data?.Files?.[0]?.Url;
    if (!fileURL) {
      throw new Error("ConvertAPI returned no file URL");
    }

    return res.status(200).json({ downloadUrl: fileURL });

  } catch (error) {
    console.error("Server error:", error.response?.data || error);
    return res.status(500).json({ error: "Conversion failed on server." });
  }
}
