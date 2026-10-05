import React from 'react';
import { X, MapPin, Phone, Clock, MessageSquare } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#2B1810]/50 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-lg bg-[#F5EFEB] rounded-[2rem] p-7 sm:p-9 shadow-2xl border border-[#2B1810]/15">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#2B1810]/5 hover:bg-[#2B1810]/10 text-[#2B1810] flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-[10px] font-mono-code font-bold tracking-[0.25em] text-[#C46726] uppercase">
          REACH US ANYTIME
        </div>
        <h2 className="font-display font-black text-3xl sm:text-4xl text-[#2B1810] uppercase tracking-tight mb-6">
          VISIT OR ORDER
        </h2>

        <div className="space-y-4 font-mono-code text-xs">
          <div className="bg-[#ECE4D8] p-4 rounded-2xl border border-[#2B1810]/10 flex items-start gap-3.5">
            <MapPin className="w-5 h-5 text-[#DE8030] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#2B1810] uppercase">Store Location</div>
              <div className="text-[#2B1810]/75 mt-0.5 leading-relaxed">
                Sector 31-D, Main Korangi Crossing Road, Korangi, Karachi, Sindh, Pakistan
              </div>
              <div className="text-[10px] text-[#C46726] mt-1">Dine-in, Takeaway & Fast Delivery</div>
            </div>
          </div>

          <div className="bg-[#ECE4D8] p-4 rounded-2xl border border-[#2B1810]/10 flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-[#DE8030] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#2B1810] uppercase">Operating Hours</div>
              <div className="text-[#2B1810]/75 mt-0.5">
                Open Daily: 12:00 PM – 2:00 AM (Late Night Service)
              </div>
              <div className="text-[10px] text-[#2E7D32] mt-1 font-bold">● Open Now for Orders</div>
            </div>
          </div>

          <div className="bg-[#ECE4D8] p-4 rounded-2xl border border-[#2B1810]/10 flex items-start gap-3.5">
            <Phone className="w-5 h-5 text-[#DE8030] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#2B1810] uppercase">Direct Phone Support</div>
              <div className="text-[#2B1810]/75 mt-0.5 font-bold text-sm">
                0321 555 2199 / 021 3505 2199
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="https://wa.me/923215552199"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-mono-code text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
          <button
            onClick={onClose}
            className="py-3 px-6 rounded-full bg-[#2B1810] text-[#F5EFEB] font-mono-code text-xs uppercase font-bold tracking-wider hover:bg-[#3E241A] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
