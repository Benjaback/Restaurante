import React from 'react';
import Navbar from '../components/navbar';
import Inicio from '../pages/public/Inicio';
import Menu from '../pages/public/Menu';
import SobreMi from '../pages/public/SobreMi';

function PublicLayout() {
  return (
    <>
      <Navbar />
      <main>
        <section className="page-section" id="inicio">
          <Inicio />
        </section>
        <section className="page-section" id="clases">
          <Menu />
        </section>
        <section className="page-section" id="sobre-mi">
          <SobreMi />
        </section>
      </main>
    </>
  );
}

export default PublicLayout;
