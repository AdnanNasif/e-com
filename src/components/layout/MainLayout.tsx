import React from 'react';
import { Navbar } from './Navbar';

interface MainLayoutProps {
  children: React.ReactNode;
  navbarProps: any;
}

export function MainLayout({ children, navbarProps }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 transition-colors duration-500">
      <Navbar {...navbarProps} />
      <main className="pt-20">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-20 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <h2 className="text-2xl font-black italic tracking-tighter">LIZ LIFESTYLE</h2>
            <p className="text-neutral-400 text-sm leading-relaxed font-sans">
              "Elegance in every thread. Crafted for those who appreciate the finer details of premium daily wear."
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-neutral-500">Shop</h4>
            <div className="space-y-4 text-sm text-neutral-400 font-sans">
              <p className="hover:text-white cursor-pointer transition-colors">Women's Collection</p>
              <p className="hover:text-white cursor-pointer transition-colors">Men's Collection</p>
              <p className="hover:text-white cursor-pointer transition-colors">Premium Line</p>
              <p className="hover:text-white cursor-pointer transition-colors">New Arrivals</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-neutral-500">Contact</h4>
            <div className="space-y-4 text-sm text-neutral-400 font-sans">
              <p>Mirpur DOHS, Dhaka</p>
              <p>+880 1XXXXXXXXX</p>
              <p>lizlifestylebd@gmail.com</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-neutral-500">Follow Us</h4>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 cursor-pointer transition-colors">
                <span className="font-bold">fb</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 cursor-pointer transition-colors">
                <span className="font-bold">ig</span>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-20 pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between gap-4 items-center">
          <p className="text-xs text-neutral-500 font-mono tracking-widest uppercase">
            © 2024 LIZ LIFESTYLE • CRAFTED WITH ELEGANCE
          </p>
          <div className="flex gap-8 text-[10px] text-neutral-600 font-mono tracking-widest uppercase">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
