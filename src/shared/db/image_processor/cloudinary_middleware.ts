import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurar el storage de Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'productos', // Carpeta en Cloudinary donde se guardarán las imágenes
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // Formatos permitidos
    transformation: [
      { width: 800, height: 600, crop: 'limit' }, // Redimensionar automáticamente
      { quality: 'auto' } // Optimización automática de calidad
    ],
  } as any,
});

// Crear el middleware de upload
export const uploadToCloudinary = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipo de archivo
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen') as any, false);
    }
  },
});

// Función para eliminar imagen de Cloudinary
export const deleteFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Función para extraer el public_id de una URL de Cloudinary
export const extractPublicIdFromUrl = (url: string): string => {
  try {
    // URL típica: https://res.cloudinary.com/dibhdyvcw/image/upload/v1234567890/productos/imagen.jpg
    const parts = url.split('/');
    const versionIndex = parts.findIndex(part => part.startsWith('v'));
    if (versionIndex !== -1 && versionIndex < parts.length - 1) {
      // Tomar todo después de la versión y remover la extensión
      const pathAfterVersion = parts.slice(versionIndex + 1).join('/');
      return pathAfterVersion.replace(/\.[^/.]+$/, ''); // Remover extensión
    }
    return '';
  } catch (error) {
    console.error('Error extracting public_id from URL:', error);
    return '';
  }
};

export { cloudinary };
