export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Try to avoid CORS issues
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Draw image scaled down for performance
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0;
        let count = 0;

        // Simple average color sampling (skipping transparent/white/black pixels to find the real brand color)
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const alpha = data[i + 3];

          if (alpha < 128) continue; // Skip transparent
          
          // Skip pure white or near white
          if (red > 240 && green > 240 && blue > 240) continue;
          
          // Skip pure black or near black
          if (red < 15 && green < 15 && blue < 15) continue;

          r += red;
          g += green;
          b += blue;
          count++;
        }

        if (count === 0) {
          resolve(null);
          return;
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        // Convert to HEX
        const hex = "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
        resolve(hex);
      } catch (err) {
        console.error('Error extracting color:', err);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      resolve(null);
    };

    img.src = imageUrl;
  });
}
