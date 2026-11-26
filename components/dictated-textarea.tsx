"use client";
import {useEffect,useState,type ComponentProps} from 'react';
import {Textarea} from './ui/textarea';
import VoiceInput from './voice-input';

type Props=Omit<ComponentProps<typeof Textarea>,'value'|'onChange'> & {
 value:string;
 onValueChange:(value:string)=>void;
 onBusyChange?:(busy:boolean)=>void;
};
/** Shared comment/note editor using the same local dictation as ticket comments. */
export default function DictatedTextarea({value,onValueChange,onBusyChange,disabled,maxLength,...props}:Props){
 const [available,setAvailable]=useState(false),[dictating,setDictating]=useState(false),[preview,setPreview]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const abort=new AbortController();fetch('/api/capabilities',{signal:abort.signal}).then(r=>r.json()).then(data=>setAvailable(!!data.whisper)).catch(()=>{});return()=>abort.abort();},[]);
 useEffect(()=>{onBusyChange?.(dictating);},[dictating,onBusyChange]);
 useEffect(()=>()=>onBusyChange?.(false),[onBusyChange]);
 const append=(text:string)=>{const next=value?`${value}\n${text}`:text;if(maxLength&&next.length>maxLength){setError(`Keep this note under ${maxLength.toLocaleString()} characters. Shorten the text before saving.`);}onValueChange(next);};
 return <div className="answer-composer"><Textarea {...props} maxLength={maxLength} disabled={disabled} readOnly={dictating||props.readOnly} value={preview?`${value}${value?'\n':''}${preview}`:value} onChange={e=>onValueChange(e.target.value)}/><div className="answer-composer-tools"><span className="answer-composer-hint">Type or dictate</span><VoiceInput compact available={available} disabled={disabled||props.readOnly} onBusyChange={setDictating} onPreview={setPreview} onError={setError} onText={append}/></div>{error&&<p role="alert">{error}</p>}</div>;
}
