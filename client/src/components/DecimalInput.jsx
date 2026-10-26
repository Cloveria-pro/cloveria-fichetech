import { useEffect, useRef, useState } from 'react';
import { parseDecimal } from '../utils.js';

// Champ décimal acceptant la virgule et le point (« 12,5 » ou « 12.5 »).
// Le texte tapé n'est jamais réécrit pendant la saisie ; il est resynchronisé avec `value`
// quand le champ n'a pas le focus (affichage avec le point, comme ailleurs dans l'appli).
const MOTIF = /^\d*[.,]?\d*$/;

function texteDepuis(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = parseDecimal(value);
  return n === null ? String(value) : String(n);
}

export default function DecimalInput({ value, onValueChange, onBlur, onFocus, ...rest }) {
  const [texte, setTexte] = useState(() => texteDepuis(value));
  const aLeFocus = useRef(false);

  useEffect(() => {
    if (!aLeFocus.current) setTexte(texteDepuis(value));
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={texte}
      onFocus={e => { aLeFocus.current = true; onFocus?.(e); }}
      onChange={e => {
        const t = e.target.value.replace(/\s/g, '');
        if (!MOTIF.test(t)) return;
        setTexte(t);
        onValueChange?.(parseDecimal(t));
      }}
      onBlur={() => {
        aLeFocus.current = false;
        const n = parseDecimal(texte);
        setTexte(texteDepuis(value));
        onBlur?.(n);
      }}
    />
  );
}
