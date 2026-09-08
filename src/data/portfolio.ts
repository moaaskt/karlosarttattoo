import tattoo01 from "@/assets/tattoo-detail-01.jpg";
import tattoo02 from "@/assets/tattoo-detail-02.jpg";
import tattoo03 from "@/assets/tattoo-detail-03.jpg";
import tattoo04 from "@/assets/tattoo-detail-04.jpg";
import tattoo05 from "@/assets/tattoo-detail-05.jpg";
import tattoo06 from "@/assets/tattoo-detail-06.jpg";

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  instagramUrl: string; // Link direto do post original
  caption: string;
  type: "image" | "video";
}

export const portfolioItems: PortfolioItem[] = [
  {
    id: "1",
    imageUrl: tattoo01,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Tatuagem geométrica e fine line autoral no antebraço",
    type: "image",
  },
  {
    id: "2",
    imageUrl: tattoo02,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Retrato editorial com composição abstrata nas costas",
    type: "image",
  },
  {
    id: "3",
    imageUrl: tattoo03,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Processo em vídeo e criação de arte personalizada",
    type: "video",
  },
  {
    id: "4",
    imageUrl: tattoo04,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Detalhe de tatuagem ornamental em preto sólido",
    type: "image",
  },
  {
    id: "5",
    imageUrl: tattoo05,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Sessão e projeto exclusivo no pescoço",
    type: "video",
  },
  {
    id: "6",
    imageUrl: tattoo06,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Tatuagem botânica de traço fino no braço",
    type: "image",
  },
  {
    id: "7",
    imageUrl: tattoo01,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Linhas precisas e texturas delicadas",
    type: "image",
  },
  {
    id: "8",
    imageUrl: tattoo04,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Composição autoral no antebraço",
    type: "image",
  },
  {
    id: "9",
    imageUrl: tattoo02,
    instagramUrl: "https://www.instagram.com/karlitostattooo/",
    caption: "Arte contemporânea na pele",
    type: "video",
  },
];
