import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whcgetmvlhysrhkyxupz.supabase.co';
const supabaseServiceKey = 'sb_secret_Oo1xQmBsfxbJYVO9iUFd9A_dVzL4rHk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createProductsBucket() {
  console.log('Creando bucket "products"...');
  
  const { data, error } = await supabase.storage.createBucket('products', {
    public: true,
    fileSizeLimit: 2097152, // 2MB
  });

  if (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
      console.log('El bucket ya existe. Todo en orden.');
    } else {
      console.error('Error al crear el bucket:', error.message);
    }
  } else {
    console.log('Bucket "products" creado correctamente:', data);
  }
}

createProductsBucket();
