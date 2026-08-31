import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBookOpen, FiLogOut, FiLogIn, FiUserPlus, FiShield, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const scrollToSection = (index) => {
  const sections = document.querySelectorAll('.page-section');
  if (sections[index]) {
    sections[index].scrollIntoView({ behavior: 'smooth' });
  }
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const { user, empleado, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const sections = document.querySelectorAll('.page-section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(sections).indexOf(entry.target);
            setActiveSection(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => sections.forEach((section) => observer.unobserve(section));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = ['Inicio', 'Menu', 'Sobre mí'];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--solid' : 'navbar--top'}`}>
      <div className="navbar-container">
        <button className="navbar-logo" onClick={() => scrollToSection(0)}>
          <div className="navbar-logo-icon">
            <FiBookOpen size={20} />
          </div>
          <span className="navbar-logo-text">La Casa Grande</span>
        </button>

        <button
          className={`navbar-toggle ${menuOpen ? 'navbar-toggle--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        <div className={`navbar-overlay ${menuOpen ? 'navbar-overlay--visible' : ''}`} onClick={() => setMenuOpen(false)} />

        <ul className={`navbar-menu ${menuOpen ? 'navbar-menu--open' : ''}`}>
          {navItems.map((item, index) => (
            <li className="navbar-item" key={index}>
              <button
                className={`navbar-link ${activeSection === index ? 'navbar-link--active' : ''}`}
                onClick={() => {
                  scrollToSection(index);
                  setMenuOpen(false);
                }}
              >
                {item}
                <span className="navbar-link-bar"></span>
              </button>
            </li>
          ))}
          <li className="navbar-item navbar-divider" role="separator"></li>
          {user ? (
            <>
              {(user.is_staff || user.is_superuser || empleado) && (
                <li className="navbar-item">
                  <Link
                    to="/admin"
                    className="navbar-link navbar-link--admin"
                    onClick={() => setMenuOpen(false)}
                  >
                    <FiShield size={16} />
                    Admin
                    <span className="navbar-link-bar"></span>
                  </Link>
                </li>
              )}
              <li className="navbar-item">
                <button
                  className="navbar-link navbar-link--logout"
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                >
                  <FiLogOut size={16} />
                  Cerrar sesión
                  <span className="navbar-link-bar"></span>
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <Link
                  to="/login"
                  className="navbar-link"
                  onClick={() => setMenuOpen(false)}
                >
                  <FiLogIn size={16} />
                  Iniciar sesión
                  <span className="navbar-link-bar"></span>
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/register"
                  className="navbar-link"
                  onClick={() => setMenuOpen(false)}
                >
                  <FiUserPlus size={16} />
                  Registrarse
                  <span className="navbar-link-bar"></span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
