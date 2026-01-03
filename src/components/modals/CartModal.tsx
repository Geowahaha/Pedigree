import React from 'react';
import { Product } from '@/data/petData';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

const CartModal: React.FC<CartModalProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemoveItem,
  onClearCart 
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer */}
      <div className="relative bg-white h-full w-full max-w-md shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#8B9D83]/10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#2C2C2C]">Shopping Cart</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#8B9D83]/10 text-[#6B7D63] text-sm font-medium">
              {items.length} items
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#F5F1E8] transition-colors"
          >
            <svg className="w-6 h-6 text-[#2C2C2C]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#F5F1E8] flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#8B9D83]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#2C2C2C] mb-2">Your cart is empty</h3>
              <p className="text-[#2C2C2C]/60 mb-6">Discover our premium pet products in the marketplace.</p>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-[#8B9D83] text-white font-medium hover:bg-[#7A8C72] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-4 p-4 rounded-2xl bg-[#F5F1E8]/50 border border-[#8B9D83]/10">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[#2C2C2C] line-clamp-1">{item.product.name}</h4>
                    <p className="text-sm text-[#2C2C2C]/50 mb-2">{item.product.seller}</p>
                    
                    <div className="flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                          className="w-8 h-8 rounded-lg bg-white border border-[#8B9D83]/20 flex items-center justify-center hover:bg-[#8B9D83]/10 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#2C2C2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center font-medium text-[#2C2C2C]">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-white border border-[#8B9D83]/20 flex items-center justify-center hover:bg-[#8B9D83]/10 transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#2C2C2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>

                      {/* Price & Remove */}
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#2C2C2C]">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#2C2C2C]/40 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear Cart */}
              <button
                onClick={onClearCart}
                className="w-full py-2 text-sm text-[#C97064] hover:text-[#B86054] font-medium transition-colors"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-[#8B9D83]/10 bg-[#F5F1E8]/50">
            {/* Summary */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#2C2C2C]/60">Subtotal</span>
                <span className="text-[#2C2C2C]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#2C2C2C]/60">Shipping</span>
                <span className="text-[#2C2C2C]">
                  {shipping === 0 ? (
                    <span className="text-[#8B9D83]">Free</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-[#8B9D83]">
                  Add ${(50 - subtotal).toFixed(2)} more for free shipping
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-[#8B9D83]/20">
                <span className="font-semibold text-[#2C2C2C]">Total</span>
                <span className="text-xl font-bold text-[#2C2C2C]">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button className="w-full py-4 rounded-xl bg-[#C97064] text-white font-semibold hover:bg-[#B86054] transition-colors">
                Checkout
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl border border-[#8B9D83]/30 text-[#2C2C2C] font-medium hover:bg-white transition-colors"
              >
                Continue Shopping
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-[#8B9D83]/10">
              <div className="flex items-center gap-1.5 text-xs text-[#2C2C2C]/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure Checkout
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#2C2C2C]/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Buyer Protection
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
