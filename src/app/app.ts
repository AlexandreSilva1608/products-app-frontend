import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap, catchError, of, tap } from 'rxjs';
import { environment } from '../environments/environment';

interface Product {
  productId: number;
  name: string;
  quantity: number; 
  price: number;
}

interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

interface CartItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  stock: number;
}

interface OrderItemRequest {
  productId: number;
  quantity: number;
}

interface UnavailableProduct {
  productId: number;
  available: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gray-50 font-sans leading-normal tracking-normal min-h-screen">
      <div class="container mx-auto p-4 lg:p-8">
        <header class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-800">Catálogo de Produtos</h1>
          <p class="text-gray-600">Explore os nossos produtos e adicione-os ao seu carrinho.</p>
        </header>

        <div class="lg:flex lg:space-x-8">
          <main class="lg:w-2/3">
            <div class="mb-6">
              <input
                type="text"
                placeholder="Buscar por nome do produto..."
                [value]="searchTerm()"
                (input)="onSearchTermChange($event)"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Campo de busca por nome do produto"
              />
            </div>
            @if (isLoading()) {
              <div class="text-center p-10">
                <p class="text-gray-600 animate-pulse">A carregar produtos...</p>
              </div>
            } @else if (products().length > 0) {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                @for (product of products(); track product.productId) {
                  <div class="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300">
                    <div class="p-6 flex flex-col h-full">
                      <h2 class="text-xl font-semibold text-gray-800 h-16 flex-grow">{{ product.name }}</h2>
                      <p class="text-lg text-gray-800 font-bold">{{ formatPrice(product.price) }}</p>
                      <p class="text-gray-600 mt-2">Disponível: {{ product.quantity }}</p>
                      <button
                        (click)="addToCart(product)"
                        [disabled]="product.quantity === 0"
                        class="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        aria-label="Adicionar {{ product.name }} ao carrinho"
                      >
                        {{ product.quantity > 0 ? 'Adicionar ao Carrinho' : 'Indisponível' }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="text-center p-10 bg-white rounded-lg shadow">
                <p class="text-gray-600">Nenhum produto encontrado. Verifique se a API está a correr.</p>
              </div>
            }
            @if (!isLoading() && totalPages() > 1) {
              <nav class="mt-8 flex justify-center items-center space-x-2">
                @for (page of pages(); track page) {
                  <button
                    (click)="goToPage(page - 1)"
                    [class.bg-blue-600]="page - 1 === currentPage()"
                    [class.text-white]="page - 1 === currentPage()"
                    [class.bg-white]="page - 1 !== currentPage()"
                    class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                    aria-label="Ir para a página {{ page }}"
                  >
                    {{ page }}
                  </button>
                }
              </nav>
            }
          </main>
          <aside class="lg:w-1/3 mt-8 lg:mt-0">
            <div class="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 class="text-2xl font-bold text-gray-800 border-b pb-4 mb-4">Carrinho</h2>
              @if (cart().length === 0) {
                <div class="text-gray-500">O seu carrinho está vazio.</div>
              } @else {
                <div>
                  @for (item of cart(); track item.productId) {
                    <div class="flex justify-between items-center mb-4">
                      <div>
                        <p class="font-semibold">{{ item.name }}</p>
                        <p class="text-sm text-gray-500">{{ formatPrice(item.price) }} x {{item.quantity}}</p>
                      </div>
                      <div class="flex items-center space-x-3">
                        <button (click)="updateQuantity(item.productId, -1)" class="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300" aria-label="Remover uma unidade de {{ item.name }}">-</button>
                        <span>{{ item.quantity }}</span>
                        <button (click)="updateQuantity(item.productId, 1)" [disabled]="item.quantity >= item.stock" class="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50" aria-label="Adicionar uma unidade de {{ item.name }}">+</button>
                      </div>
                    </div>
                  }
                  <div class="border-t pt-4 mt-4">
                      <div class="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>{{ formatPrice(cartTotal()) }}</span>
                      </div>
                  </div>
                  <button (click)="checkout()" class="mt-6 w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                      Finalizar Pedido
                  </button>
                </div>
              }
            </div>
            @if (checkoutSuccessMessage()) {
              <div class="mt-4 p-4 bg-green-100 text-green-800 rounded-lg shadow">
                {{ checkoutSuccessMessage() }}
              </div>
            }
            @if (checkoutError(); as error) {
              <div class="mt-4 p-4 bg-red-100 text-red-800 rounded-lg shadow">
                <p class="font-bold mb-2">Erro no checkout! Produtos indisponíveis:</p>
                <ul>
                  @for (err of error.unavailableProducts; track err.productId) {
                    <li>ID do Produto: {{err.productId}}, Disponível: {{err.available}}</li>
                  }
                </ul>
              </div>
            }
          </aside>
        </div>
      </div>
    </div>
  `
})
export class AppComponent {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; 

  searchTerm = signal<string>('');
  currentPage = signal<number>(0);
  isLoading = signal<boolean>(true);
  cart = signal<CartItem[]>([]);
  checkoutSuccessMessage = signal<string | null>(null);
  checkoutError = signal<{ unavailableProducts: UnavailableProduct[] } | null>(null);

  private searchTrigger = computed(() => ({ term: this.searchTerm(), page: this.currentPage() }));

  private productsResult$ = toObservable(this.searchTrigger).pipe(
    tap(() => this.isLoading.set(true)),
    debounceTime(300),
    switchMap(trigger => this.fetchProducts(trigger.page, 6, trigger.term)),
    tap(() => this.isLoading.set(false))
  );

  private productsState = toSignal(this.productsResult$, {
    initialValue: { content: [], totalPages: 0, totalElements: 0, number: 0, size: 6 } as Page<Product>
  });

  products = computed(() => this.productsState().content);
  totalPages = computed(() => this.productsState().totalPages);
  cartTotal = computed(() => this.cart().reduce((total, item) => total + (item.price * item.quantity), 0));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));


  fetchProducts(page: number, size: number, search: string) {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('search', search);

    return this.http.get<Page<Product>>(`${this.apiUrl}/products`, { params }).pipe(
      catchError(error => {
        console.error('Falha ao carregar produtos:', error);
        this.checkoutError.set({ unavailableProducts: []});
        return of({ content: [], totalPages: 0, totalElements: 0, number: page, size: size } as Page<Product>);
      })
    );
  }

  onSearchTermChange(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.currentPage.set(0);
    this.searchTerm.set(term);
  }

  addToCart(product: Product): void {
    this.cart.update(currentCart => {
      const existingItem = currentCart.find(item => item.productId === product.productId);
      if (existingItem) {
        if (existingItem.quantity < product.quantity) {
          return currentCart.map(item =>
            item.productId === product.productId ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return currentCart;
      }
      return [...currentCart, {
        productId: product.productId, name: product.name, quantity: 1, price: product.price, stock: product.quantity
      }];
    });
  }

  updateQuantity(productId: number, change: number): void {
    this.cart.update(currentCart => {
      const item = currentCart.find(i => i.productId === productId);
      if (!item) return currentCart;

      const newQuantity = item.quantity + change;
      if (newQuantity <= 0) {
        return currentCart.filter(i => i.productId !== productId);
      }
      if (newQuantity <= item.stock) {
        return currentCart.map(i =>
          i.productId === productId ? { ...i, quantity: newQuantity } : i
        );
      }
      return currentCart;
    });
  }

  checkout(): void {
    if (this.cart().length === 0) return;
    this.checkoutSuccessMessage.set(null);
    this.checkoutError.set(null);

    const orderItems: OrderItemRequest[] = this.cart().map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    this.http.post<any>(`${this.apiUrl}/orders`, { items: orderItems }).subscribe({
      next: (response) => {
        this.checkoutSuccessMessage.set(`Pedido #${response.id} criado com sucesso!`);
        this.cart.set([]);
        this.currentPage.set(0);
        this.searchTerm.set(this.searchTerm());
      },
      error: (err) => {
        if (err.status === 409) {
          this.checkoutError.set({ unavailableProducts: err.error });
        } else {
          console.error('Erro no checkout:', err);
          this.checkoutError.set({ unavailableProducts: [] });
        }
      }
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
