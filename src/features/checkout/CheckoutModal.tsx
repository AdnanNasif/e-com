import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutForm: {
    customer_name: string;
    phone: string;
    address: string;
    delivery_location: 'inside' | 'outside';
  };
  setCheckoutForm: (form: any) => void;
  onCheckoutSubmit: (e: React.FormEvent) => void;
  isSubmittingOrder: boolean;
  totalCartPrice: number;
  deliveryCharge: number;
  finalTotal: number;
  orderSuccess: boolean;
  setOrderSuccess: (val: boolean) => void;
  onContinueShopping: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  checkoutForm,
  setCheckoutForm,
  onCheckoutSubmit,
  isSubmittingOrder,
  totalCartPrice,
  deliveryCharge,
  finalTotal,
  orderSuccess,
  setOrderSuccess,
  onContinueShopping
}: CheckoutModalProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-8 shadow-2xl"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold dark:text-white">Checkout</h2>
                <p className="text-sm text-neutral-500">Complete your order details below.</p>
              </div>

              <form onSubmit={onCheckoutSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Full Name</label>
                  <Input
                    required
                    value={checkoutForm.customer_name}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })}
                    placeholder="Miss Rani"
                    className="dark:bg-neutral-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Phone Number</label>
                  <Input
                    required
                    type="tel"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="dark:bg-neutral-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Delivery Address</label>
                  <textarea
                    required
                    value={checkoutForm.address}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm ring-offset-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white"
                    placeholder="House, Road, Area, City"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Delivery Location</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setCheckoutForm({ ...checkoutForm, delivery_location: 'inside' })}
                      className={`flex items-center justify-between rounded-xl border p-4 transition-all ${checkoutForm.delivery_location === 'inside'
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-900 dark:ring-white'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold dark:text-white">Inside Dhaka</p>
                        <p className="text-xs text-neutral-500">TK 80 charge</p>
                      </div>
                      {checkoutForm.delivery_location === 'inside' && <CheckCircle2 className="h-5 w-5 text-neutral-900 dark:text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutForm({ ...checkoutForm, delivery_location: 'outside' })}
                      className={`flex items-center justify-between rounded-xl border p-4 transition-all ${checkoutForm.delivery_location === 'outside'
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-900 dark:ring-white'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold dark:text-white">Outside Dhaka</p>
                        <p className="text-xs text-neutral-500">TK 150 charge</p>
                      </div>
                      {checkoutForm.delivery_location === 'outside' && <CheckCircle2 className="h-5 w-5 text-neutral-900 dark:text-white" />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-2 border-t dark:border-neutral-800 pt-4">
                  <div className="flex justify-between text-sm dark:text-neutral-300">
                    <span className="text-neutral-500">Subtotal</span>
                    <span>TK {totalCartPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm dark:text-neutral-300">
                    <span className="text-neutral-500">Delivery</span>
                    <span>TK {deliveryCharge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold dark:text-white">
                    <span>Total</span>
                    <span>TK {finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 mt-4"
                >
                  {isSubmittingOrder ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Confirm Order'
                  )}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrderSuccess(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[2rem] bg-white dark:bg-neutral-900 p-10 text-center shadow-2xl"
            >
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
              </div>
              <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-neutral-900 dark:text-white">Order Confirmed</h3>
              <p className="mb-8 text-xs font-bold uppercase tracking-widest text-neutral-400">
                Welcome to the Liz Lifestyle family. We've received your order!
              </p>
              <div className="space-y-4">
                <Button
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-14 rounded-2xl font-black text-xs uppercase tracking-widest"
                  onClick={onContinueShopping}
                >
                  Continue Shopping
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
