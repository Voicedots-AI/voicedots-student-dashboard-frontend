export function displayName(value?:string){const s=(value||"").trim();return s?s.split(/\s+/).map(w=>w.length?w.charAt(0).toLocaleUpperCase()+w.slice(1).toLocaleLowerCase():w).join(" "):"";}
