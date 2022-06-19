import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const prevCart = localStorage.getItem('@RocketShoes:cart')

    return prevCart !== null ? JSON.parse(prevCart) : [];
  });

  useEffect(() => {
    prevCartRef.current = cart
  })

  const prevCartRef = useRef<Product[]>();

  const prevCartValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(prevCartValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, prevCartValue])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]

      const productInTheCart = updatedCart.find(product => product.id === productId)

      const { data: stock } = await api.get(`/stock/${productId}`)

      const currentAmount = productInTheCart ? productInTheCart.amount : 0;
      const amount = currentAmount + 1

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }


      if (productInTheCart) {
        productInTheCart.amount = amount
      } else {
        const { data: product } = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product,
          amount: 1
        }

        updatedCart.push(newProduct)
      }

      setCart(updatedCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId)

      if (productIndex <= -1) throw new Error()

      updatedCart.splice(productIndex, 1)
      setCart(updatedCart)

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return

      const { data: stock} = await api.get(`/stock/${productId}`)

      if(amount > stock.amount){
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => product.id === productId)

      if(productExists){
        productExists.amount = amount
        setCart(updatedCart)
      }else{
        throw new Error()
      }
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
