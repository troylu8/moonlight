export default class Heap {
    constructor(arr, comparator) {

        this.arr = arr;
        this.size = () => this.arr.length;

        const root = (i) => Math.floor(i/2);
        const left = (i) => i==0? 1 : i*2;
        const right = (i) => i==0? 2 : i*2+1;

        const swap = (x, y) => {
            const temp = this.arr[x];
            this.arr[x]= this.arr[y];
            this.arr[y] = temp;
        }

        const compare = (x, y) => y == undefined? 1 : comparator(x,y);

        this.heapify = () => {
            
            for (let i = this.arr.length/2-1; i >= 0; i--) {
                this.sink(i);
            };
            return this;
        }

        this.rise = (i) => {
            while (root(i) != i && compare(this.arr[root(i)], this.arr[i]) < 0) {
                swap(i, root(i));
                i = root(i);
            }
        }
        this.sink = (i) => {
            const l = left(i);
            const r = right(i);
            const leftExists = l < this.arr.length;
            const rightExists = r < this.arr.length;

            // no children, or bigger than both children
            if ((!leftExists && !rightExists) || 
                (compare(this.arr[i], this.arr[l]) > 0 && compare(this.arr[i], this.arr[l]) > 0)) 
                return; 
            
            // has both children
            if ( leftExists && rightExists ) {
                if (compare(this.arr[l], this.arr[r]) > 0) {
                    swap(i, l);
                    return this.sink(l);
                }
                else {
                    swap(i, r);
                    return this.sink(r);
                }
            }

            // has only left
            if (leftExists && compare(this.arr[l], this.arr[i]) > 0) {
                swap(i, l);
                return this.sink(l);
            }
            
            // has only right
            if (compare(this.arr[r], this.arr[i]) > 0) {
                swap(i, r);
                return this.sink(r);
            }
            
        }

        this.add = (item) => {
            this.arr.push(item);
            this.rise(this.arr.length);
        }
        this.pop = () => {
            if (this.arr.length === 0) return;
            const res = this.arr[0];
            this.arr[0] = this.arr[this.arr.length - 1];
            this.arr.pop();
            this.sink(0);
            return res;
        }

        this.delete = (i) => {
            if (i >= this.arr.length || i < 0) return;
            const res = this.arr[i];
            this.arr[i] = this.arr[this.arr.length - 1];
            this.arr.pop();
            this.sink(i);
            this.rise(i);
            return res;
        }

        /** 1 indexed */
        this.getHeight = () => this.arr.length === 0? 0 : Math.floor(Math.log2(this.arr.length) + 1);
        this.print = () => console.log(this.arr.length + " " + JSON.stringify(this.arr));

        this.heapify();
    }

}
