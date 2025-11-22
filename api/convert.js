import axios from 'axios';
import FormData from 'form-data';
import formidable from 'formidable';
import fs from 'fs';

// إيقاف معالج الجسم التلقائي للسماح بقراءة الملفات
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    
    // قراءة الملف المرفوع
    const [fields, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // إعداد البيانات لإرسالها لـ ConvertAPI
    const formData = new FormData();
    formData.append('File', fs.createReadStream(uploadedFile.filepath));
    formData.append('StoreFile', 'true');

    // استخدام المفتاح السري من إعدادات Vercel
    const secret = process.env.CONVERT_API_SECRET;
    if (!secret) {
       return res.status(500).json({ error: 'Server Config Error: API Key missing' });
    }

    const convertUrl = `https://v2.convertapi.com/convert/pdf/to/docx?Secret=${secret}`;

    const response = await axios.post(convertUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    const downloadUrl = response.data.Files[0].Url;
    return res.status(200).json({ downloadUrl: downloadUrl });

  } catch (error) {
    console.error('Conversion Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Conversion failed. Please try again.' });
  }
}
