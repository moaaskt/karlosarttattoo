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
    imageUrl: "/portfolio/foto1.jpeg",
    instagramUrl: "https://www.instagram.com/p/Dcj5Iw9GpqQ/?img_index=1",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
  {
    id: "2",
    imageUrl: "/portfolio/foto2.jpg",
    instagramUrl: "https://www.instagram.com/p/DcJUGlFFqtz/?img_index=1",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
  {
    id: "3",
    imageUrl: "/portfolio/foto3.jpg",
    instagramUrl: "https://www.instagram.com/p/DbgR556AKPx/",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
  {
    id: "4",
    imageUrl: "/portfolio/foto4.jpeg",
    instagramUrl: "https://www.instagram.com/p/Db5wr-6lsMX/?img_index=1",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
  {
    id: "5",
    imageUrl: "/portfolio/foto5.jpg",
    instagramUrl: "https://www.instagram.com/p/DbUG_1AggLW/",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "video",
  },
  {
    id: "6",
    imageUrl: "/portfolio/foto6.jpg",
    instagramUrl: "https://www.instagram.com/p/DbVpKg4gA1r/",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
  {
    id: "7",
    imageUrl: "/portfolio/foto7.jpg",
    instagramUrl: "https://www.instagram.com/p/DcBmR50FvVJ/?img_index=2",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
  {
    id: "8",
    imageUrl: "/portfolio/foto8.jpg",
    instagramUrl: "https://www.instagram.com/p/Dce7BMmGvG5/?img_index=1",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
  {
    id: "9",
    imageUrl: "/portfolio/foto9.jpg",
    instagramUrl: "https://www.instagram.com/p/DbHJhgoAHqq/",
    caption: "Tatuagem autoral — Karlos Art Tattoo",
    type: "image",
  },
];
