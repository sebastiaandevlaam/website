import {
    ShoppingBasket,
    HandHeart,
    Users,
    Mail,
    DollarSign,
    PackageCheck,
    ArrowRight,
    Home,
    Info,
    Phone,
    Menu,
    X,
    Apple,
    Megaphone
} from 'lucide-react';

const ICONS = {
    ShoppingBasket, HandHeart, Users, Mail, DollarSign, PackageCheck,
    ArrowRight, Home, Info, Phone, Menu, X, Apple, Megaphone
};

const Icon = ({ name, ...props }) => {
    const LucideIcon = ICONS[name];
    return LucideIcon ? <LucideIcon {...props} /> : null;
};

export default Icon;