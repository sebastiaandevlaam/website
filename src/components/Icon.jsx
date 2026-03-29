// Import Lucide icons needed for the components
import { 
    ShoppingBasket, 
    HandHeart, 
    Users, 
    Mail, 
    DollarSign, 
    PackageCheck, 
    ArrowRight,
    Home, // Example for nav
    Info, // Example for nav
    Phone, // Example for nav
    Menu, // Mobile menu icon
    X, // Close icon
    Apple, // Apple logo
    Megaphone
} from 'lucide-react';

// Helper component to dynamically render icons (Unchanged)
const Icon = ({ name, ...props }) => {
    const icons = {
      ShoppingBasket, HandHeart, Users, Mail, DollarSign, PackageCheck, ArrowRight, Home, Info, Phone, Menu, X, Apple, Megaphone
    };
    const LucideIcon = icons[name];
    return LucideIcon ? <LucideIcon {...props} /> : null;
  };
  
  export default Icon;