
import { GoogleGenAI, Type } from "@google/genai";

export async function getCoachResponse(
  instruction: string, 
  history: { role: 'user' | 'model'; parts: { text: string }[] }[], 
  message: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: instruction,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  return response.text;
}

export async function getTrainingSummary(
  biometrics: { age: string; weight: string; height: string },
  trainingText: string,
  sport: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const systemInstruction = `Eres un fisiólogo deportivo experto. El usuario ha terminado un entrenamiento de ${sport}. 
  Datos del usuario: Edad ${biometrics.age} años, Peso ${biometrics.weight}kg, Altura ${biometrics.height}cm.
  Analiza su descripción del entreno y estima métricas precisas.
  Debes devolver un JSON con:
  - calories (número)
  - weightLoss (número en kg, pérdida de líquidos)
  - intensity (número 1-10)
  - recoveryTip (string breve)
  - fatigueIndex (número 1-100)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: trainingText }] }],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          weightLoss: { type: Type.NUMBER },
          intensity: { type: Type.NUMBER },
          recoveryTip: { type: Type.STRING },
          fatigueIndex: { type: Type.NUMBER }
        },
        required: ["calories", "weightLoss", "intensity", "recoveryTip", "fatigueIndex"]
      },
      temperature: 0.2,
    },
  });

  return JSON.parse(response.text);
}

export async function generateExerciseImage(prompt: string, sportName: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const enhancedPrompt = `Un dibujo profesional y minimalista de un atleta realizando el siguiente ejercicio de ${sportName}: ${prompt}. Estilo caricatura limpia, fondo neutro oscuro, alta calidad, enfocado en la técnica correcta.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: enhancedPrompt }
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateProfileAvatar(description: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const stylePrompt = `Foto de perfil de una persona, estilo caricatura digital moderna y limpia (estilo Avataaars o Pixar simplificado). 
    Descripción física: ${description}. 
    Composición: Mirando directamente a la cámara (al frente), busto centrado, fondo de color sólido vibrante y plano. 
    Calidad: Líneas nítidas, colores saturados, sin sombras complejas, diseño de personaje amigable.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: stylePrompt }
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
