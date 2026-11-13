import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bookmark, Hand, RefreshCw, ScrollText, ShoppingCart } from 'lucide-react';
import { AbilityIcon } from './Art.jsx';

const H = ({ children }) => <h4 className="mt-5 mb-1 text-sm font-semibold text-primary">{children}</h4>;
const P = ({ children }) => <p className="my-1 text-sm leading-relaxed">{children}</p>;
const L = ({ items }) => (
  <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed">
    {items.map(([b, t], i) => <li key={i}>{b && <b>{b} </b>}{t}</li>)}
  </ul>
);

const Sub = ({ children }) => <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</div>;
const Steps = ({ items }) => (
  <ul className="space-y-2 text-sm leading-relaxed">
    {items.map(([Icon, text]) => (
      <li key={text} className="flex items-start gap-2.5"><Icon className="mt-0.5 size-4 shrink-0 text-primary" />{text}</li>
    ))}
  </ul>
);

const IconList = ({ items }) => (
  <ul className="space-y-2.5 text-sm leading-relaxed">
    {items.map(([ab, bold, text]) => (
      <li key={bold} className="flex items-start gap-3">
        <AbilityIcon ab={ab} size={32} />
        <span><b>{bold}</b> {text}</span>
      </li>
    ))}
  </ul>
);

function Summary({ exp }) {
  return (
    <div className="max-w-3xl p-6">
      <H>Goal</H>
      <P>Win at the end of your turn with 20 prestige points, 10 crowns, or 10 prestige points on cards of one colour.</P>
      <H>Your turn</H>
      <Sub>Optional, before your action</Sub>
      <Steps items={[
        [ScrollText, 'Use a privilege: return a scroll to take 1 gem or pearl token of your choice from the board. Never gold.'],
        [RefreshCw, 'Refill the board, only if the bag is not empty. Your opponent takes a privilege.'],
      ]} />
      <Sub>Then choose one</Sub>
      <Steps items={[
        [Hand, 'Take up to 3 tokens in an unbroken straight line. No gold. Taking 3 of one colour or 2 pearls gives your opponent a privilege.'],
        [Bookmark, 'Reserve a card: take a gold token and reserve a card from the pyramid or the top of a deck. Needs gold on the board and fewer than 3 reserved cards.'],
        [ShoppingCart, 'Buy a card from the pyramid or your reserve. Pay its cost minus your bonuses. Gold is wild. Spent tokens go back in the bag.'],
      ]} />
      <H>Card pictures</H>
      <IconList items={[
        ['extra', 'Go again:', 'take another turn right after this one.'],
        ['wild', 'Rainbow gem:', 'a wild bonus. Copy the colour of one of your existing bonuses. You cannot buy it with no bonus cards.'],
        ['match', 'Board:', "take a token of this card's colour from the board, if there is one."],
        ['privilege', 'Scroll:', 'take a privilege. If none are on the table, take one from your opponent.'],
        ['steal', 'Hand:', 'steal 1 gem or pearl from your opponent, never gold.'],
      ]} />
      <H>Crowns and royals</H>
      <P>Each crown picture on a card counts toward your crowns. On reaching your 3rd and 6th crown, take one of the royal cards and resolve its ability. This is not an action. The 3 and 6 on every royal card are a reminder of that.</P>
      <H>End of turn</H>
      <P>If you hold more than 10 tokens, discard down to 10. Then check the victory conditions.</P>
      <H>Privileges</H>
      <P>When you must take a privilege and none are on the table, take one from your opponent. If you already have all three, nothing happens.</P>
      {exp && (
        <>
          <h3 className="mt-6 mb-1 text-base font-semibold">The Counterfeiters expansion</h3>
          <L items={[
            ['', '4 purple glassware tokens join the bag, so 4 random tokens start off the board. Glassware counts as a gem or pearl token. Taking 3 glassware gives your opponent a privilege, and a privilege can take glassware.'],
            ['', 'Gold can substitute for glassware, and stealing can take glassware.'],
            ['', 'New mandatory action: buy one of the 3 face-up counterfeiter cards. Each costs at least 1 glassware. Counterfeiter cards cannot be reserved.'],
            ['', 'Each counterfeiter card ability works once per turn. In this game the cheapest payment is chosen automatically, and end-of-turn abilities show up as a menu after your main action.'],
            ['', 'Glassware counts toward the 10 token limit unless you own the matching counterfeiter card.'],
            ['', '12 royal cards are shuffled and 4 are revealed. Some new royals change the victory conditions, so check them often.'],
          ]} />
        </>
      )}
    </div>
  );
}

export default function Rules({ exp, onClose }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[86vh] flex-col gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Rules</DialogTitle>
          <DialogDescription>Quick summary, or the full rulebooks as PDFs.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="rules">Rulebook (PDF)</TabsTrigger>
            <TabsTrigger value="exp">Expansion (PDF)</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="min-h-0 flex-1 overflow-y-auto rounded-md border"><Summary exp={exp} /></TabsContent>
          <TabsContent value="rules" className="min-h-0 flex-1"><iframe title="Rulebook" src="/docs/rules.pdf" className="pdf h-full rounded-md" /></TabsContent>
          <TabsContent value="exp" className="min-h-0 flex-1"><iframe title="Expansion rules" src="/docs/expansion.pdf" className="pdf h-full rounded-md" /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
