import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './navbar.css';

const scrollToSection = (index) => {
  const sections = document.querySelectorAll('.page-section');
  if (sections[index]) {
    sections[index].scrollIntoView({ behavior: 'smooth' });
  }
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

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

  const navItems = ['Inicio', 'Menu', 'Sobre mí'];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* LOGO */}
        <button
          className="navbar-logo"
          onClick={() => scrollToSection(0)}
        >
          <div className="logo-circle">🍴</div>
          <span>La Mesa Grande</span>
        </button>

        {/* MENU TOGGLE (Móvil) */}
        <button
          className={`menu-toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* MENU */}
        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          {navItems.map((item, index) => (
            <li className="nav-item" key={index}>
              <button
                className={`nav-link ${activeSection === index ? 'active' : ''}`}
                onClick={() => {
                  scrollToSection(index);
                  setMenuOpen(false);
                }}
              >
                {item}
              </button>
            </li>
          ))}
          <li className="nav-item">
            <Link
              to="/admin"
              className="nav-link nav-admin"
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}