/*
 * Copyright (C) 2023 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react'
import dagre from 'dagre'
import type {Node} from 'dagre'
import bspline from 'b-spline'
import {Button, CondensedButton} from '@instructure/ui-buttons'
import {Flex} from '@instructure/ui-flex'
import {IconBulletListLine, IconZoomInLine, IconZoomOutLine} from '@instructure/ui-icons'
import {Pill} from '@instructure/ui-pill'
import {Text} from '@instructure/ui-text'
import {TruncateText} from '@instructure/ui-truncate-text'
import {View} from '@instructure/ui-view'
import type {MilestoneId, MilestoneData, PathwayDetailData} from '../types'
import {showUnimplemented} from '../shared/utils'

const BOX_WIDTH = '322'

type PathwayNode = Node<PathwayDetailData | MilestoneData>
type GraphNode = PathwayDetailData | MilestoneData | PathwayNode

type PathwayViewProps = {
  pathway: PathwayDetailData
}

type BoxHeights = {
  height: number
  milestones: Array<{id: string; height: number}>
}

interface NamespacedDiv
  extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  xmlns?: string
}

const DivInSVG: React.FC<NamespacedDiv> = props => {
  return (
    <div xmlns="http://www.w3.org/1999/xhtml" {...props}>
      {props.children}
    </div>
  )
}

const PathwayView = ({pathway}: PathwayViewProps) => {
  const [g] = useState(new dagre.graphlib.Graph())
  const [dagNodes, setDagNodes] = useState<JSX.Element[]>([])
  const [dagEdges, setDagEdges] = useState<JSX.Element[]>([])
  const [firstNodeRef, setFirstNodeRef] = useState(null)
  const [viewBox, setViewBox] = useState([0, 0, 0, 0])
  const [zoomLevel, setZoomLevel] = useState(1)
  const [preRendered, setPreRendered] = useState(false)
  const [graphBoxHeights, setGraphBoxHeights] = useState<BoxHeights>({
    height: 0,
    milestones: [],
  })
  const viewRef = useRef<HTMLDivElement>(null)
  const preRenderNodeRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handleFirstNodeRef = useCallback(
    node => {
      setFirstNodeRef(node)
    },
    [setFirstNodeRef]
  )

  const renderPathwayBoxContent = useCallback((node: GraphNode) => {
    return (
      <Flex as="div" direction="column" justifyItems="start" height="100%">
        <Flex.Item shouldGrow={true} overflowY="visible">
          <Text weight="bold">{node.title}</Text>
          <div style={{marginTop: '.5rem'}}>
            <Text size="small">
              <TruncateText maxLines={2} truncate="character">
                {node.description}
              </TruncateText>
            </Text>
          </div>
          {!('required' in node) || node.required ? null : (
            <div style={{marginTop: '.5rem'}}>
              <Pill>Optional</Pill>
            </div>
          )}
        </Flex.Item>
        <Flex margin="medium 0 0 0" alignItems="center" justifyItems="space-between">
          <Flex.Item>
            <IconBulletListLine size="small" />
            <View margin="0 0 0 x-small">
              <Text>2 requirements</Text>
            </View>
          </Flex.Item>
          <Flex.Item>
            <CondensedButton onClick={showUnimplemented}>Show</CondensedButton>
          </Flex.Item>
        </Flex>
      </Flex>
    )
  }, [])

  const renderPathwayBox = useCallback(
    (data: PathwayDetailData | MilestoneData, key: string) => {
      return (
        <div
          id={data.id}
          key={key}
          style={{
            border: '1px solid #C7CDD1',
            borderRadius: '4px',
            boxSizing: 'border-box',
            padding: '1rem',
            backgroundColor: '#fff',
            width: `${BOX_WIDTH}px`,
          }}
        >
          {renderPathwayBoxContent(data)}
        </div>
      )
    },
    [renderPathwayBoxContent]
  )

  const renderPathwayBoxes = useCallback(() => {
    const boxes = pathway.milestones.map((m: MilestoneData) => {
      return renderPathwayBox(m, `milestone-${m.id}`)
    })
    boxes.unshift(renderPathwayBox(pathway, `pathway-${pathway.id}`))

    return <div ref={preRenderNodeRef}>{boxes}</div>
  }, [pathway, renderPathwayBox])

  const renderDAG = useCallback(() => {
    // Set an object for the graph label
    g.setGraph({})

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function () {
      return {}
    })

    g.setNode('0', {
      title: pathway.title,
      description: pathway.description,
      width: 320,
      height: graphBoxHeights.height,
    })
    pathway.first_milestones.forEach((m: MilestoneId) => {
      g.setEdge('0', m)
    })
    pathway.milestones.forEach((m: MilestoneData) => {
      const ht = graphBoxHeights.milestones.find(n => n.id === m.id)?.height
      g.setNode(m.id, {
        title: m.title,
        description: m.description,
        required: m.required,
        width: 320,
        height: ht || 132,
      })
      m.next_milestones.forEach((n: MilestoneId) => {
        g.setEdge(m.id, n)
      })
    })

    dagre.layout(g)

    let maxX = 0
    let maxY = 0
    g.nodes().forEach(n => {
      const node = g.node(n)
      maxX = Math.max(maxX, node.x + node.width / 2)
      maxY = Math.max(maxY, node.y + node.height / 2)
    })
    setViewBox([0, 0, maxX, maxY])

    const nodes = g.nodes().map((n, i) => {
      const node = g.node(n)
      return (
        <foreignObject
          key={n}
          x={`${node.x - node.width / 2}`}
          y={`${node.y - node.height / 2}`}
          width={node.width}
          height={node.height}
        >
          <DivInSVG
            xmlns="http://www.w3.org/1999/xhtml"
            className={i === 0 ? undefined : 'milestone'}
            ref={i === 0 ? handleFirstNodeRef : undefined}
            id={n}
            style={{
              left: 0,
              top: 0,
              width: `${node.width}px`,
              height: `${node.height}px`,
              border: '1px solid #C7CDD1',
              borderRadius: '4px',
              boxSizing: 'border-box',
              padding: '1rem',
              backgroundColor: '#fff',
            }}
          >
            {renderPathwayBoxContent(node as PathwayNode)}
          </DivInSVG>
        </foreignObject>
      )
    })

    setDagNodes(nodes)
  }, [
    g,
    graphBoxHeights.height,
    graphBoxHeights.milestones,
    handleFirstNodeRef,
    pathway.description,
    pathway.first_milestones,
    pathway.milestones,
    pathway.title,
    renderPathwayBoxContent,
  ])

  const renderDAGEdges = useCallback(() => {
    if (firstNodeRef === null) return

    const edges = g.edges().map(edg => {
      const points = g.edge(edg).points
      const pts = points.map(p => Object.values(p))
      const commands = [`M${points[0].x} ${points[0].y}`]
      for (let t = 0; t <= 1; t += 0.1) {
        const p = bspline(t, pts.length - 1, pts)
        commands.push(`L${p[0]} ${p[1]}`)
      }
      commands.push(`L${points[points.length - 1].x} ${points[points.length - 1].y}`)
      return <path d={commands.join(' ')} fill="none" stroke="#C7CDD1" strokeWidth={2} />
    })
    setDagEdges(edges)
  }, [g, firstNodeRef])

  const handleZoomIn = useCallback(() => {
    setZoomLevel(zoomLevel + 0.1)
  }, [zoomLevel])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(zoomLevel - 0.1)
  }, [zoomLevel])

  useEffect(() => {
    const sty = document.createElement('style')
    sty.innerText = `
    .dag {
        overflow: visible!important;
        font-size: 16px;
    }
    `
    document.head.appendChild(sty)
    return () => {
      sty.remove()
    }
  }, [])

  useLayoutEffect(() => {
    if (preRenderNodeRef?.current) {
      const boxes = Array.from(preRenderNodeRef.current.children)
      const boxHeights: BoxHeights = boxes.reduce(
        // we're reducing and accumulating a value that's not the same type as the array
        // that's not how reduce is typed.
        // @ts-expect-error
        (acc: BoxHeights, n: HTMLDivElement, index: number) => {
          const {height} = n.getBoundingClientRect()
          if (index === 0) {
            acc.height = height
          } else {
            acc.milestones.push({id: n.id, height})
          }
          return acc
        },
        {height: 0, milestones: []}
      ) as unknown as BoxHeights
      setPreRendered(true)
      setGraphBoxHeights(boxHeights)
    }
  }, [pathway.id, preRenderNodeRef])

  useEffect(() => {
    if (preRendered && graphBoxHeights.height > 0) {
      renderDAG()
    }
  }, [graphBoxHeights.height, preRendered, renderDAG])

  useEffect(() => {
    renderDAGEdges()
  }, [dagNodes, renderDAGEdges])

  return preRendered ? (
    <div style={{position: 'relative'}} ref={viewRef}>
      <div style={{position: 'absolute', top: '.5rem', left: '.5rem', zIndex: 1}}>
        <Button renderIcon={IconZoomOutLine} onClick={handleZoomOut} />
        <Button renderIcon={IconZoomInLine} onClick={handleZoomIn} margin="0 0 0 x-small" />
      </div>
      <div style={{position: 'absolute', top: '.5rem', right: '.5rem', zIndex: 1}}>
        <Button onClick={showUnimplemented}>View as learner</Button>
      </div>
      <div
        style={{
          position: 'relative',
          overflow: 'auto',
          backgroundSize: '40px 40px',
          backgroundImage: `linear-gradient(to right, rgba(150, 173, 233, .3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(150, 173, 233, .3) 1px, transparent 1px)`,
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: '.5rem',
            transform: `scale(${zoomLevel})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            ref={svgRef}
            className="dag"
            viewBox={`${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`}
            x={viewBox[0]}
            y={viewBox[1]}
            width={viewBox[2]}
            height={viewBox[3]}
          >
            {dagNodes}
            {dagEdges}
          </svg>
        </div>
      </div>
    </div>
  ) : (
    renderPathwayBoxes()
  )
}

export default PathwayView
