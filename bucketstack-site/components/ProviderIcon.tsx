import React from 'react';

const providerIcons: Record<string, string> = {
  'AWS S3': '/icons/s3.svg',
  'Cloudflare R2': '/icons/r2.svg',
  'Wasabi': '/icons/wasabi.jpg',
  'MinIO': '/icons/minio.jpeg',
  'DigitalOcean': '/icons/spaces.svg',
  'Backblaze B2': '/icons/backblaze-b2.png',
  'Railway': '/icons/railway.svg',
  'Custom S3': '/icons/s3.svg'
};

const ProviderIcon: React.FC<{ name: string }> = ({ name }) => {
  const iconSrc = providerIcons[name];

  return (
    <div className="flex flex-col items-center justify-center p-6 transition-all duration-300 hover:scale-105">
      <div className="h-16 w-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {iconSrc ? (
          <img src={iconSrc} alt={name} className="w-10 h-10 object-contain" />
        ) : (
          <span className="text-lg font-bold text-gray-700 select-none">
            {name.charAt(0)}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-gray-700">{name}</span>
    </div>
  );
};

export default ProviderIcon;