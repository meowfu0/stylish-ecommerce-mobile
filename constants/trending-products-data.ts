export type TrendingCatalogProduct = {
  description: string;
  id: string;
  image: number;
  imageLabel: string;
  price: string;
  rating: number;
  reviewCount: string;
  title: string;
};

export const TRENDING_CATALOG_PRODUCTS = [
  {
    description: "Autumn and winter casual cotton-padded jacket",
    id: "black-winter-hoodie",
    image: require("@/assets/images/trending-products/black-winter.png"),
    imageLabel: "Black graphic winter hoodie on a wooden hanger",
    price: "₱499",
    rating: 4.5,
    reviewCount: "6,890",
    title: "Black Winter Hoodie",
  },
  {
    description: "Men’s starry sky printed shirt in 100% cotton fabric",
    id: "mens-starry-shirt",
    image: require("@/assets/images/trending-products/mens-starry.png"),
    imageLabel: "Black short-sleeve shirt with a white star print",
    price: "₱399",
    rating: 4.5,
    reviewCount: "152,344",
    title: "Men’s Starry Shirt",
  },
  {
    description: "Solid black dress for women with chain straps",
    id: "black-dress",
    image: require("@/assets/images/trending-products/black-dress.png"),
    imageLabel: "Woman wearing a fitted black dress",
    price: "₱2,000",
    rating: 4.5,
    reviewCount: "523,456",
    title: "Black Dress",
  },
  {
    description: "Earthen rose pink embroidered tiered maxi dress",
    id: "pink-embroidered-dress",
    image: require("@/assets/images/trending-products/pink-embroidered.png"),
    imageLabel: "Woman wearing a rose pink embroidered maxi dress",
    price: "₱1,900",
    rating: 4.5,
    reviewCount: "45,678",
    title: "Pink Embroidered Dress",
  },
  {
    description: "Black and rust orange floral-print tiered midi dress",
    id: "flare-dress",
    image: require("@/assets/images/trending-products/flare-dress.png"),
    imageLabel: "Woman wearing a black and rust floral flare dress",
    price: "₱1,990",
    rating: 4.5,
    reviewCount: "335,566",
    title: "Flare Dress",
  },
  {
    description: "Blue cotton denim dress with a printed top",
    id: "denim-dress",
    image: require("@/assets/images/trending-products/denim-dress.png"),
    imageLabel: "Woman wearing a printed top and blue denim shorts",
    price: "₱999",
    rating: 4.5,
    reviewCount: "27,344",
    title: "Denim Dress",
  },
  {
    description: "Air Jordan basketball shoe with a fresh modern profile",
    id: "jordan-stay",
    image: require("@/assets/images/trending-products/jordan-stay.png"),
    imageLabel: "Black, red, and white Air Jordan basketball shoe",
    price: "₱4,999",
    rating: 4.5,
    reviewCount: "1,023,456",
    title: "Jordan Stay",
  },
  {
    description: "6 GB RAM, 64 GB ROM, expandable up to 256 GB",
    id: "realme-7",
    image: require("@/assets/images/trending-products/realme-7.png"),
    imageLabel: "Blue Realme 7 smartphone shown from the front and back",
    price: "₱3,499",
    rating: 4.5,
    reviewCount: "344,567",
    title: "Realme 7",
  },
  {
    description: "Sony PS4 Slim 1 TB console with three games",
    id: "sony-ps4",
    image: require("@/assets/images/trending-products/sony-ps4.png"),
    imageLabel: "Sony PlayStation 4 Mega Pack console bundle",
    price: "₱1,999",
    rating: 4.5,
    reviewCount: "835,566",
    title: "Sony PS4",
  },
  {
    description: "Warm and comfortable black jacket for everyday wear",
    id: "black-jacket",
    image: require("@/assets/images/trending-products/black-jacket.png"),
    imageLabel: "Black zip-up jacket with a warm brown lining",
    price: "₱2,999",
    rating: 4.5,
    reviewCount: "223,569",
    title: "Black Jacket",
  },
  {
    description: "Nikon D7200 digital camera complete set",
    id: "nikon-d7200",
    image: require("@/assets/images/trending-products/nikon-d7200.png"),
    imageLabel: "Nikon D7200 camera with box, charger, strap, and manual",
    price: "₱26,999",
    rating: 4.5,
    reviewCount: "67,456",
    title: "Nikon D7200 Camera",
  },
  {
    description: "George Walker derby brown formal shoes",
    id: "mens-formal-shoes",
    image: require("@/assets/images/trending-products/mens-formal-shoes.png"),
    imageLabel: "Brown leather derby formal shoe",
    price: "₱999",
    rating: 4.5,
    reviewCount: "1,345,678",
    title: "Men’s Formal Shoes",
  },
] as const satisfies readonly TrendingCatalogProduct[];

export function getTrendingCatalogProduct(id: string | undefined) {
  return TRENDING_CATALOG_PRODUCTS.find((product) => product.id === id);
}
