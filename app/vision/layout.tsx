import {VisionSessionProvider} from '@/components/vision/session';
import '@/components/vision/vision.css';
export default function VisionLayout({children}:{children:React.ReactNode}){return <VisionSessionProvider>{children}</VisionSessionProvider>;}
