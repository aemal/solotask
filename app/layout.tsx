import "./heroui.css";
import "./globals.css";
import "./hero-theme.css";
export const metadata = {
  title: "SoloTask",
  description: "See what your agents are building.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t;try{t=localStorage.getItem('task-ui-theme')}catch(e){}if(t!=='dark'&&t!=='light')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
