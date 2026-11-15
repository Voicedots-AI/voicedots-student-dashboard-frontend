import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./assessment-popup.css";
export default function AssessmentPopup({title,company,children,onClose}:{title:string;company?:string|null;children:ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null),heading=useId();
 useEffect(()=>{const trigger=document.activeElement as HTMLElement|null;ref.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=old;trigger?.focus()}},[]);
 return createPortal(<dialog ref={ref} className="da-dialog" aria-labelledby={heading} onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose()}}><header><div><span>DRIVE ASSESSMENT</span><h2 id={heading}>{title}</h2>{company&&<p>{company}</p>}</div><button type="button" aria-label="Close drive assessment" onClick={onClose}><X size={20}/></button></header><div className="da-body">{children}</div></dialog>,document.body);
}
