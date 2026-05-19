import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-primary-dark text-white py-12 border-t border-primary/20">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Column 1 - Branding */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/atomberg-logo.png" 
                alt="AtombergHR" 
                className="h-10 w-auto rounded-lg"
              />
              <div>
                <span className="font-display font-bold text-xl">AtombergHR</span>
              </div>
            </Link>
            <p className="text-primary-light text-sm">
              Enterprise HRMS for Data-Driven Companies
            </p>
            <p className="text-white/60 text-sm">
              © 2025 AtombergHR. All rights reserved.
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 - Company Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">About AtombergHR</h4>
            <p className="text-primary-light text-sm leading-relaxed">
              Atomberg's internal HR and Goal Management Portal. Powering innovation through clean, connected, and contextual data.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
