import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health & Status check endpoint
app.get('/api/status', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  res.json({
    status: 'ok',
    geminiReady: hasKey,
    model: 'gemini-3.8-flash',
  });
});

// AI Project Generator Endpoint
app.post('/api/generate-project', async (req, res) => {
  try {
    const { idea, board, difficulty, features } = req.body;

    if (!idea || typeof idea !== 'string') {
      return res.status(400).json({ error: 'يرجى تقديم فكرة المشروع' });
    }

    const prompt = `
أنت خبير ومهندس أنظمة مدمجة وميكاترونكس متخصص في برمجة وتطوير مشاريع الأردوينو.
المطلوب إنشاء مشروع أردوينو كامل واحترافي باللغة العربية بناءً على المعطيات التالية:
- فكرة المشروع: ${idea}
- اللوحة المستهدفة: ${board || 'Arduino Uno'}
- مستوى الصعوبة: ${difficulty || 'متوسط'}
- ميزات مطلوبة: ${features || 'غير محدد'}

يجب أن تقوم بتوليد كائن JSON كامل مطابق للمواصفات التالية:
{
  "id": "معرف باللغة الإنجليزية بدون مسافات",
  "title": "عنوان جذاب وشامل للمشروع بالعربية",
  "board": "${board || 'Arduino Uno'}",
  "difficulty": "${difficulty || 'متوسط'}",
  "time": "الوقت المتوقع للإنجاز (مثال: ساعتان، 4 ساعات)",
  "overview": "شرح نظري وهندسي وافٍ لفكرة المشروع وطريقة عمله والتطبيقات الواقعية",
  "practicalApplications": ["تطبيق 1", "تطبيق 2", "تطبيق 3"],
  "components": [
    {
      "name": "اسم القطعة بالعربية والإنجليزية",
      "qty": 1,
      "specs": "المواصفات الفنية أو الفولتية",
      "function": "وظيفة القطعة في هذا المشروع"
    }
  ],
  "wiring": [
    {
      "arduinoPin": "رقم المنفذ بالأردوينو (مثال: D2, A0, 5V, GND)",
      "componentName": "اسم القطعة",
      "componentPin": "رجل أو منفذ القطعة (مثال: VCC, Trig, Echo, OUT)",
      "wireColor": "اللون الموصى به للسلك (أحمر، أسود، أزرق، أصفر، أخضر)",
      "notes": "ملاحظة هامة (مثل: مقاومة حماية 220 أوم، أو سحب Pull-up)"
    }
  ],
  "wiringSteps": [
    "خطوة توصيل 1 واضحة ومباشرة",
    "خطوة توصيل 2 واضحة ومباشرة"
  ],
  "code": "كود C++ كامل وجاهز للنسخ متضمن كل المكتبات اللازمة ودوال setup و loop مع تعليقات وشروح عربية وافية داخل الكود",
  "librariesNeeded": ["اسم المكتبة إن وجدت وطريقة تثبيتها من Library Manager"],
  "proTips": [
    "نصيحة أمان أو نصيحة احترافية لتفادي الاحتراق أو أخطاء التغذية الكهربائية",
    "نصيحة للمعايرة واختبار الحساسات"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت مهندس أنظمة مدمجة ومحترف أردوينو. ردك يجب أن يكون بصيغة JSON حصراً بدون أي نصوص قبلية أو بعدية، وباللغة العربية الفصحى الواضحة والراقية.',
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Clean possible markdown code fences if any
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json({ project: parsedData });
  } catch (err: any) {
    console.error('Error in /api/generate-project:', err);
    res.status(500).json({
      error: 'فشل في توليد المشروع من خلال الذكاء الاصطناعي. تفاصيل: ' + (err.message || 'خطأ غير معروف'),
    });
  }
});

// AI Debugger & Troubleshooting Endpoint
app.post('/api/debug-project', async (req, res) => {
  try {
    const { category, board, problemDescription, errorLogs, currentCode } = req.body;

    if (!problemDescription && !errorLogs) {
      return res.status(400).json({ error: 'يرجى تقديم وصف للمشكلة أو سجل الأخطاء' });
    }

    const prompt = `
أنت كبير مهندسي تشخيص أعطال الأردوينو والإلكترونيات (Arduino Lead Troubleshooting Engineer).
لدينا مشكلة طارئة في مشروع أردوينو بالبيانات التالية:
- تصنيف المشكلة: ${category || 'غير محدد'}
- نوع اللوحة: ${board || 'Arduino Uno'}
- وصف المشكلة: ${problemDescription || 'غير متوفر'}
- سجل الأخطاء والرسائل البرمجية (Compiler/Serial Log):
${errorLogs || 'لا يوجد سجل'}
- الكود البرمجي الحالي للمستخدم:
${currentCode ? currentCode : 'لم يتم إرفاق كود'}

قم بإجراء تحليل شامل للأسباب الجذرية وتقديم حل كامل وتصحيح الكود بالكامل بصيغة JSON كالتالي:
{
  "summary": "ملخص سريع وتشخيص فوري للمشكلة في سطرين",
  "rootCauseAnalysis": [
    "السبب الجذري الأول المحتمل (مثلاً: تعارض دبابيس أو نقص تغذية أو تداخل مكتبات)",
    "السبب الثاني المحتمل"
  ],
  "stepByStepFix": [
    "الخطوة الأولى للإصلاح",
    "الخطوة الثانية للإصلاح"
  ],
  "hardwareChecklist": [
    "فحص وجود أرضي مشترك (Common GND) بين اللوحة والمشغلات الخارجية",
    "فحص جهد التغذية واستهلاك التيار",
    "فحص سرعة البود ريت (Baud rate) في كود Serial.begin ومطابقتها لشاشة المراقبة"
  ],
  "correctedCode": "كود C++ معدل وخالٍ من الأخطاء بالكامل مع تعليقات توضيحية للأماكن التي تم تعديلها وحل الخطأ فيها",
  "preventionTips": [
    "نصيحة لتجنب تكرار هذه المشكلة في المستقبل"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت مهندس تشخيص أعطال أردوينو احترافي. أجب بصيغة JSON فقط، مع لغة عربية علمية دقيقة وواضحة، واحرص على تقديم كود C++ مصحح ونظيف جداً.',
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json({ debugReport: parsedData });
  } catch (err: any) {
    console.error('Error in /api/debug-project:', err);
    res.status(500).json({
      error: 'فشل في تشخيص المشكلة بواسطة الذكاء الاصطناعي: ' + (err.message || 'خطأ غير معروف'),
    });
  }
});

// Setup Vite in Dev or static serving in Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
