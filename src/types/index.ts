export type Category = 'Política MX' | 'Economía' | 'Deportes' | 'Global' | 'Tech' | 'Entretenimiento'

export interface Market {
  id: string
  question: string
  description: string
  category: Category
  yesPrice: number
  volume: number
  liquidity: number
  endsAt: string
  resolutionCriteria: string
  trending: boolean
  isMultiChoice?: boolean
  choices?: Choice[]
  history: PricePoint[]
  comments: Comment[]
}

export interface Choice {
  id: string
  label: string
  price: number
}

export interface PricePoint {
  date: string
  price: number
}

export interface Comment {
  id: string
  author: string
  avatar: string
  text: string
  time: string
  likes: number
}

export interface Position {
  marketId: string
  question: string
  side: 'YES' | 'NO'
  amount: number
  avgPrice: number
  currentPrice: number
  category: Category
}

export interface User {
  username: string
  displayName: string
  points: number
  rank: number
  accuracy: number
  marketsTraded: number
  positions: Position[]
  pnlHistory: PricePoint[]
}
