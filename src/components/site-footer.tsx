import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <h3 className="font-display text-lg font-bold">YovoShop</h3>
          <p className="mt-2 max-w-xs text-sm text-sidebar-foreground/70">
            Votre boutique en ligne au Bénin. Paiement Mobile Money sécurisé.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Navigation</h4>
          <ul className="mt-3 space-y-2 text-sm text-sidebar-foreground/70">
            <li><Link to="/" className="hover:text-sidebar-foreground">Accueil</Link></li>
            <li><Link to="/boutique" className="hover:text-sidebar-foreground">Boutique</Link></li>
            <li><Link to="/panier" className="hover:text-sidebar-foreground">Panier</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-sidebar-foreground/70">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +229 00 00 00 00</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> contact@yovoshop.bj</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Cotonou, Bénin</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border/60 py-4 text-center text-xs text-sidebar-foreground/60">
        © {new Date().getFullYear()} YovoShop · Paiement MTN MoMo & Moov Money
      </div>
    </footer>
  );
}