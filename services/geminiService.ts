
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionData, Category, Language, Difficulty } from "../types";

const FALLBACK_BANK: Record<Language, Record<string, { q: string, a: string, e?: string }[]>> = {
  ar: {
    'ديني 🕋': [
      { q: "ما هو الركن الثاني من أركان الإسلام؟", a: "الصلاة", e: "تعتبر الصلاة عماد الدين وهي أول ما يحاسب عليه المرء." },
      { q: "من هو أول خليفة بعد النبي محمد ﷺ؟", a: "أبو بكر الصديق رضي الله عنه" },
      { q: "ما اسم أطول سورة في القرآن الكريم؟", a: "سورة البقرة" }
    ],
    'جغرافيا 🌍': [
      { q: "ما هي عاصمة اليابان؟", a: "طوكيو" },
      { q: "ما هي أصغر دولة في العالم من حيث المساحة؟", a: "الفاتيكان" },
      { q: "ما هو أطول نهر في العالم؟", a: "نهر النيل" }
    ],
    'علوم 🔬': [
      { q: "ما هو الكوكب الملقب بالكوكب الأحمر؟", a: "المريخ" },
      { q: "ما هو الرمز الكيميائي للأكسجين؟", a: "O" },
      { q: "ما هي أصلب مادة طبيعية على وجه الأرض؟", a: "الألماس" }
    ],
    'تاريخ 📜': [
      { q: "من هو العالم الذي اكتشف الجاذبية؟", a: "إسحاق نيوتن" },
      { q: "في أي عام بدأت الحرب العالمية الأولى؟", a: "1914" }
    ]
  },
  en: {
    'ديني 🕋': [{ q: "What is the second pillar of Islam?", a: "Prayer (Salah)" }],
    'جغرافيا 🌍': [{ q: "What is the capital of Japan?", a: "Tokyo" }],
    'علوم 🔬': [{ q: "What is the chemical symbol for Oxygen?", a: "O" }],
    'تاريخ 📜': [{ q: "Who discovered gravity?", a: "Isaac Newton" }]
  }
};

export const fetchQuestion = async (categories: Category[], difficulty: Difficulty, history: string[], language: Language): Promise<QuestionData> => {
  let selectedCategory = categories[0] || 'عشوائي 🎲';
  
  if (selectedCategory === 'عشوائي 🎲') {
    const pool = ['ديني 🕋', 'جغرافيا 🌍', 'تاريخ 📜', 'علوم 🔬', 'رياضة 🏅', 'أدب 📚', 'فن 🎨'];
    selectedCategory = pool[Math.floor(Math.random() * pool.length)] as Category;
  }

  const langKey = language === 'ar' ? 'ar' : 'en';
  const categoryKey = selectedCategory as string;
  // تأمين الوصول للبيانات حتى لو كانت الفئة غير موجودة في البنك
  const questionsForCategory = FALLBACK_BANK[langKey][categoryKey] || FALLBACK_BANK[langKey]['جغرافيا 🌍'] || FALLBACK_BANK['ar']['جغرافيا 🌍'];
  const localFallback = questionsForCategory[Math.floor(Math.random() * questionsForCategory.length)];

  if (!navigator.onLine) {
    return {
      question: localFallback.q,
      answer: localFallback.a,
      explanation: localFallback.e || (language === 'ar' ? "من الأرشيف المحلي" : "From local archive"),
      category: selectedCategory,
      difficulty: 'متوسط'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are a professional quiz master for an educational app called 'Wisdom Spin'.
      Task: Generate ONE unique, high-quality trivia question.
      Category: ${selectedCategory}
      Difficulty: ${difficulty}
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
      Constraint: Must be different from: ${history.slice(-10).join(', ')}.
      Format: Strict JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            category: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          },
          required: ["question", "answer", "explanation"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const data = JSON.parse(text.trim());
    
    return {
      question: data.question || localFallback.q,
      answer: data.answer || localFallback.a,
      explanation: data.explanation || "",
      category: selectedCategory,
      difficulty: difficulty
    };

  } catch (error) {
    console.error("Gemini Service Error:", error);
    return {
      question: localFallback.q,
      answer: localFallback.a,
      explanation: language === 'ar' ? "عذراً، تعذر الاتصال بالذكاء الاصطناعي حالياً. تم استخدام سؤال احتياطي." : "AI connection failed. Using fallback question.",
      category: selectedCategory,
      difficulty: 'متوسط'
    };
  }
};
