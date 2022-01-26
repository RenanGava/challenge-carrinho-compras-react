import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product} from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(()=>{
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(()=>{
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart] // fazendo isso podemos utilizar conceitos do JS dentro do
                                  // react
      const productExists = updatedCart.find(product => product.id === productId)

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount
      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if(productExists){
        productExists.amount = amount
      }else{
        //aqui estamos verificando se não existe o produto no carrinho
        const product = await api.get(`/products/${productId}`)
        // criamos o produto caso ele não exista no carrinho
        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct)// aqui atualizamos a lista com o push e não quebramos a 
                                    // imutabilidade do react
        // vamos colocar agora dentro do carrinho os novos valores ou perpetuar
        
        // para colocarmos os valores dentro do localstorage devemos transfomalos para string
      }
      setCart(updatedCart)
      // sem usar o useRef podemos fazer assim também passando o localstorage em cada função
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex( product => product.id === productId)
      //como findIndex() retorna -1 se não encontrar usamos essa verificação para apagar o dado
      // com o splice()
      if(productIndex >= 0){
        // dessa forma vamos apagar apartir do produto que queremos e apenas um produto
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      }else{
        // aqui forçamos a dar um erro já que não encontramos o produto
        // no caso irá forçar direto para o catch
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return
      }

      const stock = await api.get(`/stock/${productId}`)
      const  stockAmount = stock.data.amount

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updatedCart = [...cart]

      const porductExists = updatedCart.find(product => product.id === productId)

      if(porductExists){
        porductExists.amount = amount
        setCart(updatedCart)
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      }else{
        throw Error()
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
