       * STEP 2: SAVE THE SALE
       *
       * IMPORTANT:
       * We pass "none" here so createKhataSale does not
       * automatically send another WhatsApp receipt.
       *
       * The WhatsApp receipt is handled explicitly below
       * through the Edge Function.
       * ---------------------------------------------------------
       */

      const txId = await shopStore.createKhataSale({
        customerId,

        items: items.map((item) => {
          const enteredQuantity = Number(item.quantityInput ?? item.quantity);
          const enteredUnit = normalizeUnit(item.unit);
          const inventoryUnit = normalizeUnit(item.inventoryUnit ?? item.unit);
          const inventoryQuantity = item.inventoryId
            ? item.allowLooseSale
              ? convertQuantity(enteredQuantity, enteredUnit, inventoryUnit) ?? enteredQuantity
              : enteredQuantity
            : enteredQuantity;

          return {
            ...(item.inventoryId ? { inventoryId: item.inventoryId } : {}),
            ...(item.productId ? { productId: item.productId } : {}),
            ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
            product: item.product,
            quantity: inventoryQuantity,
            unit: inventoryUnit,
            rate: item.rate,
            enteredQuantity,
            enteredUnit,
            finalAmount: item.finalAmount,
          };
        }),

        paid: paidNum,
        bargainingAmount: bargainingNum,
        method,
        date: entryDate,
        reference: paymentReference.trim() || undefined,