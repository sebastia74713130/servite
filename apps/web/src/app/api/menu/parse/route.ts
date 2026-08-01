import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { files } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no está configurada. Por favor, crea una en Google AI Studio y agrégala a las variables de entorno.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Prepare parts array with all files
    const fileParts = files.map((file: { data: string, mimeType: string }) => {
      // Clean base64 string if it has data URI prefix
      const base64Data = file.data.replace(/^data:(.*);base64,/, '');
      return {
        inlineData: {
          data: base64Data,
          mimeType: file.mimeType || 'image/jpeg',
        }
      };
    });

    const prompt = `
Eres un asistente experto en extraer información de menús de restaurantes.
Voy a pasarte una imagen de un menú.
Necesito que extraigas TODAS las categorías y los productos con sus precios.
Si un producto tiene descripción, extráela también.
Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:

{
  "theme": {
    "brand_color": "Hex code for the primary brand color based on the logo/menu colors (e.g. #FF5A5F)",
    "background_color": "Hex code for a suitable light background color (e.g. #F9FAFB)",
    "text_color": "Hex code for a highly readable text color (e.g. #1F2933)"
  },
  "categories": [
    {
      "name": "Nombre de la categoría (ej. Hamburguesas)",
      "products": [
        {
          "name": "Nombre del producto",
          "description": "Descripción del producto o vacio",
          "price": 15.5
        }
      ]
    }
  ]
}

- Asegúrate de convertir los precios a formato numérico (número). Si el precio tiene comas, usa puntos para los decimales.
- Si no hay precio explícito, usa 0.
- Tu respuesta debe ser SOLO JSON válido, nada más.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: [
        {
          role: 'user',
          parts: [
            ...fileParts,
            { text: prompt }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text;
    
    if (!responseText) {
        throw new Error('Empty response from AI');
    }
    
    const parsedData = JSON.parse(responseText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error parsing menu:', error);
    return NextResponse.json({ error: error.message || 'Error processing menu' }, { status: 500 });
  }
}
