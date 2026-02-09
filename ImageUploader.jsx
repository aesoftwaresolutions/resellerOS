// src/components/products/ImageUploader.jsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Star, GripVertical, Loader2, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { images } from '../../api/endpoints';

export default function ImageUploader({ productId, disabled = false }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch existing images
  const { data: imageData, isLoading } = useQuery({
    queryKey: ['productImages', productId],
    queryFn: () => images.list(productId),
    enabled: !!productId,
  });

  const imageList = imageData?.data || [];

  // Upload mutation
  const uploadMut = useMutation({
    mutationFn: (files) => images.uploadMultiple(productId, files),
    onSuccess: (res) => {
      const uploaded = res.data?.uploaded?.length || 0;
      const failed = res.data?.failed?.length || 0;
      if (uploaded > 0) toast.success(`${uploaded} image${uploaded > 1 ? 's' : ''} uploaded`);
      if (failed > 0) toast.error(`${failed} image${failed > 1 ? 's' : ''} failed`);
      queryClient.invalidateQueries(['productImages', productId]);
    },
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (imageId) => images.delete(imageId),
    onSuccess: () => {
      toast.success('Image removed');
      queryClient.invalidateQueries(['productImages', productId]);
    },
  });

  // Set primary mutation
  const primaryMut = useMutation({
    mutationFn: (imageId) => images.setPrimary(productId, imageId),
    onSuccess: () => {
      toast.success('Primary image set');
      queryClient.invalidateQueries(['productImages', productId]);
    },
  });

  // Dropzone
  const onDrop = useCallback((acceptedFiles) => {
    if (!productId) {
      toast.error('Save the product first before uploading images');
      return;
    }
    if (imageList.length + acceptedFiles.length > 16) {
      toast.error('Maximum 16 images per product');
      return;
    }
    uploadMut.mutate(acceptedFiles);
  }, [productId, imageList.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 16,
    maxSize: 10 * 1024 * 1024,
    disabled: disabled || !productId || uploadMut.isLoading,
  });

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-brand-500 bg-brand-600/10'
            : 'border-surface-300/40 hover:border-brand-500/40 hover:bg-surface-100/50'
          }
          ${(!productId || disabled) ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploadMut.isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-brand-500" />
            <p className="text-sm text-brand-400">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-surface-200/50 flex items-center justify-center">
              <Upload size={20} className="text-surface-500" />
            </div>
            {isDragActive ? (
              <p className="text-sm text-brand-400 font-medium">Drop images here</p>
            ) : (
              <>
                <p className="text-sm text-surface-600">Drag & drop or click to upload</p>
                <p className="text-xs text-surface-400">JPG, PNG, WebP · Max 10MB · Up to 16 images</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Image previews */}
      {imageList.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {imageList.map((img, i) => (
            <div
              key={img.id}
              className={`relative group rounded-xl overflow-hidden aspect-square border-2 transition-colors
                ${img.is_primary ? 'border-brand-500' : 'border-transparent hover:border-surface-400/60'}`}
            >
              <img
                src={img.thumbnail_url || img.url}
                alt={`Product image ${i + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Primary badge */}
              {img.is_primary && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-brand-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                  <Star size={10} /> Primary
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <button
                    onClick={(e) => { e.stopPropagation(); primaryMut.mutate(img.id); }}
                    className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                    title="Set as primary"
                  >
                    <Star size={14} className="text-white" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMut.mutate(img.id); }}
                  className="p-1.5 bg-red-500/30 backdrop-blur-sm rounded-lg hover:bg-red-500/50 transition-colors"
                  title="Delete"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count indicator */}
      {imageList.length > 0 && (
        <p className="text-xs text-surface-500 text-center">
          {imageList.length}/16 images · First image is used as cover
        </p>
      )}

      {/* No product warning */}
      {!productId && (
        <p className="text-xs text-amber-400 text-center">
          Save the product first to enable image uploads
        </p>
      )}
    </div>
  );
}
