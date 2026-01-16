import React from 'react';
import { Product } from '@/data/petData';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onQuickView }) => {
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group bg-white rounded-[24px] overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20">
              -{discount}%
            </span>
          </div>
        )}

        {/* Verified Badge */}
        {product.verified && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center p-0.5" title="Verified Seller">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
          <button
            onClick={() => onAddToCart(product)}
            className="flex-1 py-3 px-4 rounded-xl bg-[#0d0c22] text-white text-sm font-bold shadow-lg hover:bg-[#ea4c89] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add
          </button>
          <button
            onClick={() => onQuickView(product)}
            className="w-12 h-12 rounded-xl bg-white text-[#0d0c22] shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category & Pet Type */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
            {product.category}
          </span>
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-400">
            {product.petType === 'all' ? 'All' : product.petType}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-bold text-[#0d0c22] mb-1 line-clamp-2 min-h-[3rem] text-lg leading-tight group-hover:text-[#ea4c89] transition-colors">
          {product.name}
        </h3>

        {/* Seller */}
        <p className="text-xs text-gray-400 font-medium mb-4 flex items-center gap-1">
          <span>By</span>
          <span className="text-gray-600">{product.seller}</span>
        </p>

        {/* Footer: Price & Rating */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[#0d0c22]">${product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through decoration-gray-300 decoration-2">${product.originalPrice.toFixed(2)}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-bold text-[#0d0c22]">
              {product.rating}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
