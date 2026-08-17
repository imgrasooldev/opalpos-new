import {
  RECENT_ORDERS,
  type OrderStatus,
} from "@/components/dashboard/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

const STATUS: Record<OrderStatus, { label: string; tone: "green" | "amber" | "blue" }> = {
  paid: { label: "Paid", tone: "green" },
  pending: { label: "Pending", tone: "amber" },
  shipped: { label: "Shipped", tone: "blue" },
};

export function RecentOrders({ className }: { className?: string }) {
  return (
    <Card
      className={className}
      title="Recent orders"
      action={
        <a
          href="/sales"
          className="flex items-center gap-1.5 text-[13px] font-medium text-brand-500 hover:text-brand-600"
        >
          View all orders
          <Icon name="arrow-right" className="h-4 w-4" />
        </a>
      }
      bodyClassName="px-0 pb-2"
    >
      {/* chhoti screens par table apne container mein scroll karta hai */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-line text-xs text-muted">
              <th scope="col" className="px-5 py-2.5 font-medium">Order</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Customer</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Total</th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Date</th>
            </tr>
          </thead>

          <tbody>
            {RECENT_ORDERS.map((order) => (
              <tr
                key={order.id}
                className="border-b border-line last:border-0 transition-colors hover:bg-surface"
              >
                <td className="px-5 py-3 font-medium tabular-nums">{order.id}</td>
                <td className="px-5 py-3">{order.customer}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS[order.status].tone}>
                    {STATUS[order.status].label}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{order.total}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">
                  {order.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
