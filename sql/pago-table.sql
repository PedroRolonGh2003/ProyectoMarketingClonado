-- Ejecutar en MySQL si la tabla Pago no existe
CREATE TABLE IF NOT EXISTS Pago (
  idPago INT AUTO_INCREMENT PRIMARY KEY,
  idDefensa INT NOT NULL,
  monto DECIMAL(10, 2) NOT NULL DEFAULT 1,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  fechaPago DATETIME NULL,
  UNIQUE KEY uk_pago_defensa (idDefensa),
  CONSTRAINT fk_pago_defensa FOREIGN KEY (idDefensa) REFERENCES Defensa(idDefensa)
);
