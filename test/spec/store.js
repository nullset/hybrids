import { test, resolveRaf } from '../helpers';
import { define } from '../../src';

import * as store from '../../src/store';

describe('store:', () => {
  describe('for single model', () => {
    let User;
    beforeEach(() => {
      User = {
        firstName: 'default',
        lastName: 'default',
        fullName: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      };
    });

    it('adds "undefined" model', () => {
      store.set(User, { firstName: 'John', lastName: 'Smith' });
      expect(store.get(User)).toEqual({ firstName: 'John', lastName: 'Smith' });
      expect(store.get(User).id).toBe(undefined);
    });

    it('uses default values', () => {
      store.set(User, { });
      expect(store.get(User)).toEqual({ firstName: 'default', lastName: 'default' });
    });

    it('omits not defined properties', () => {
      store.set(User, { test: 'test' });
      expect(store.get(User)).toEqual({ firstName: 'default', lastName: 'default' });
    });

    it('adds models with different id types', () => {
      store.set(User, { id: '1', firstName: 'A', lastName: 'B' });
      store.set(User, { id: 2, firstName: 'C', lastName: 'D' });
      const userOne = store.get(User, '1');
      const userTwo = store.get(User, 2);

      expect(userOne).toEqual({ firstName: 'A', lastName: 'B' });
      expect(userTwo).toEqual({ firstName: 'C', lastName: 'D' });
    });

    it('updates model by instance', () => {
      store.set(User, { id: '1', firstName: 'John', lastName: 'Smith' });
      const userBefore = store.get(User, '1');

      store.set(userBefore, { firstName: 'Arnold' });
      const userAfter = store.get(User, '1');

      expect(userAfter).not.toBe(userBefore);
      expect(userAfter).toEqual({ firstName: 'Arnold', lastName: 'Smith' });
    });

    it('does not updates model if values has not changed', () => {
      store.set(User, { id: '1', firstName: 'John', lastName: 'Smith' });
      const userBefore = store.get(User, '1');

      store.set(userBefore, { firstName: 'John' });
      const userAfter = store.get(User, '1');

      expect(userAfter).toBe(userBefore);
    });

    it('updates model by value with id', () => {
      store.set(User, { id: '1', firstName: 'John', lastName: 'Smith' });
      store.set(User, { id: '1', firstName: 'Arnold' });

      expect(store.get(User, '1')).toEqual({ firstName: 'Arnold', lastName: 'Smith' });
    });

    it('removes instance from store', () => {
      store.set(User, { firstName: 'John', lastName: 'Smith' });
      const user = store.get(User);
      store.set(user, null);

      expect(store.get(User)).toBe(null);
    });

    it('returns computed property', () => {
      store.set(User, { firstName: 'John', lastName: 'Smith' });
      expect(store.get(User).fullName).toBe('John Smith');
    });
  });

  describe('for nested object value', () => {
    let Model;
    beforeEach(() => {
      Model = {
        attributes: {
          one: 1,
          two: 2,
        },
      };

      store.set(Model, { id: '1', attributes: { one: 2, two: 1 } });
    });

    it('returns nested attributes', () => {
      const model = store.get(Model, '1');
      expect(model).toEqual({ attributes: { one: 2, two: 1 } });
    });

    it('stringifies returned nested attributes', () => {
      const model = store.get(Model, '1');
      expect(JSON.stringify(model)).toEqual(JSON.stringify({ attributes: { one: 2, two: 1 } }));
    });

    it('throws when setting nested object', () => {
      const model = store.get(Model, '1');
      expect(() => { model.attributes = {}; }).toThrow();
    });

    it('updates nested object by instance reference', () => {
      const modelBefore = store.get(Model, '1');
      store.set(modelBefore, { attributes: { one: 3 } });
      const modelAfter = store.get(Model, '1');

      expect(modelAfter).not.toBe(modelBefore);
      expect(modelAfter.attributes).toEqual({ one: 3, two: 1 });
    });

    it('does not update nested object when values has not changed', () => {
      const modelBefore = store.get(Model, '1');
      store.set(Model, { id: '1', attributes: { one: 2, two: 1 } });
      const modelAfter = store.get(Model, '1');

      expect(modelAfter.attributes).toBe(modelBefore.attributes);
      expect(modelAfter.attributes).toEqual({ one: 2, two: 1 });
    });

    it('does not update root object when nested reference has not changed', () => {
      const modelBefore = store.get(Model, '1');
      store.set(Model, { id: '1', attributes: modelBefore.attributes });
      const modelAfter = store.get(Model, '1');

      expect(modelAfter).toBe(modelBefore);
      expect(modelAfter.attributes).toEqual({ one: 2, two: 1 });
    });

    it('updates nested object by its definition reference', () => {
      const modelBefore = store.get(Model, '1');
      store.set(Model.attributes, { id: '1', one: 3 });
      const modelAfter = store.get(Model, '1');

      expect(modelAfter).toBe(modelBefore);
      expect(modelAfter.attributes).toEqual({ one: 3, two: 1 });
    });

    it('updates nested object by id', () => {
      store.set(Model.attributes, { id: 'custom', one: 10, two: 20 });
      store.set(Model, { attributes: 'custom' });
      const model = store.get(Model);
      expect(model.attributes).toEqual({ one: 10, two: 20 });
    });
  });

  describe('for list model', () => {
    let User;
    beforeEach(() => {
      User = {
        firstName: 'default',
        lastName: 'default',
        fullName: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      };
      store.set(User, { id: 1, firstName: 'John', lastName: 'Smith' });
      store.set(User, { id: 2, firstName: 'Mary', lastName: 'Jane' });
    });

    it('throws when Model is not an object', () => {
      expect(() => { store.list('1'); }).toThrow();
    });

    it('returns a user list', () => {
      const users = store.list(User);
      expect(users.length).toBe(2);
      expect(users[0]).toEqual({ firstName: 'John', lastName: 'Smith' });
      expect(users[1]).toEqual({ firstName: 'Mary', lastName: 'Jane' });
    });

    it('does not return removed user', () => {
      const user1 = store.get(User, 1);
      store.set(user1, null);

      const users = store.list(User);
      expect(users.length).toBe(1);
      expect(users[0]).toEqual({ firstName: 'Mary', lastName: 'Jane' });
    });

    it('returns empty list for defined parameters without adapter', () => {
      const users = store.list(User, { firstName: 'John' });
      expect(users).toEqual([]);
    });
  });

  xdescribe('synchronous adapter', () => {
    let storage;
    let User;

    beforeEach(() => {
      storage = {
        0: { firstName: 'John', lastName: 'Smith' },
        1: { firstName: 'Mary', lastName: 'Jane' },
      };

      User = {
        firstName: '',
        lastName: '',
        fullName: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      };

      store.connect(User, {
        get(id, lastValue) {
          if (!lastValue) {
            return storage[id];
          }
          return lastValue;
        },
        set(id, value) {
          storage[id] = value;
        },
      });
    });

    describe('for single definition', () => {
      define('test-store-one', {
        id: '0',
        user: ({ id }) => store.get(User, id),
      });

      const tree = test(`
        <div>
          <test-store-one></test-store-one>
          <test-store-one></test-store-one>
        </div>
      `);

      it('returns an instance', tree(container => resolveRaf(() => {
        const el1 = container.children[0];
        const el2 = container.children[1];

        expect(el1.user).toEqual({ firstName: 'John', lastName: 'Smith' });
        expect(el1.user.fullName).toBe('John Smith');

        expect(el2.user).toEqual({ firstName: 'John', lastName: 'Smith' });
        expect(el2.user.fullName).toBe('John Smith');
      })));

      it('patches "firstName" property using an instance', tree(container => resolveRaf(() => {
        const el1 = container.children[0];
        const el2 = container.children[1];

        store.set(el1.user, { firstName: 'Arnold' });

        return resolveRaf(() => {
          expect(el1.user).toEqual({ firstName: 'Arnold', lastName: 'Smith' });
          expect(el1.user.fullName).toBe('Arnold Smith');

          expect(el2.user).toEqual({ firstName: 'Arnold', lastName: 'Smith' });
          expect(el2.user.fullName).toBe('Arnold Smith');
        });
      })));

      it('patches "firstName" property using an instance', tree(container => resolveRaf(() => {
        const el1 = container.children[0];
        const el2 = container.children[1];

        store.set(el1.user, { firstName: 'Arnold' });

        return resolveRaf(() => {
          expect(el1.user).toEqual({ firstName: 'Arnold', lastName: 'Smith' });
          expect(el1.user.fullName).toBe('Arnold Smith');

          expect(el2.user).toEqual({ firstName: 'Arnold', lastName: 'Smith' });
          expect(el2.user.fullName).toBe('Arnold Smith');
        });
      })));
    });
  });
});
